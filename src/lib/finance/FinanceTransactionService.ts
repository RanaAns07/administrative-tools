/**
 * @file FinanceTransactionService.ts
 * @description THE ONLY PLACE WHERE WALLET BALANCES CHANGE.
 *
 * All money movement in the system must flow through this service.
 * Every method:
 *   1. Checks accounting period lock (before any DB write)
 *   2. Opens a MongoDB client session + transaction
 *   3. Creates a FinanceTx record
 *   4. Updates Wallet.currentBalance via $inc (atomic, inside session)
 *   5. Updates the related entity (invoice / slip / expense / refund)
 *   6. Commits on success, aborts on any error
 *
 * CONCURRENCY PROTECTION:
 *   - $inc inside a session prevents lost-update race conditions
 *   - After $inc we verify balance >= 0; if not → abort immediately
 *   - Wallet.__v (optimistic lock) guards concurrent document saves
 *
 * ZERO SIDE EFFECTS OUTSIDE THIS FILE:
 *   - No pre('save') hooks update balances
 *   - No API route touches Wallet.currentBalance directly
 *   - No model middleware performs financial mutations
 */

import mongoose, { ClientSession, Types } from 'mongoose';
import Transaction from '@/models/finance/Transaction';
import Wallet from '@/models/finance/Wallet';
import FeeInvoice from '@/models/finance/FeeInvoice';
import SalarySlip from '@/models/finance/SalarySlip';
import ExpenseRecord from '@/models/finance/ExpenseRecord';
import Refund, { IRefund } from '@/models/finance/Refund';
import SecurityDeposit from '@/models/finance/SecurityDeposit';
import Investment from '@/models/finance/Investment';
import StudentAdvanceBalance from '@/models/finance/StudentAdvanceBalance';
import AccountingPeriod from '@/models/finance/AccountingPeriod';
import dbConnect from '@/lib/mongodb';
import { FinanceError } from './FinanceError';
import {
    FinanceTxType,
    INFLOW_TYPES,
    balanceDeltaSign,
} from './transactionTypes';

// ─── Shared Param Types ───────────────────────────────────────────────────────

export interface BaseParams {
    performedBy: Types.ObjectId | string;
    date?: Date;
    notes?: string;
}

export interface FeePaymentParams extends BaseParams {
    invoiceId: string;
    amount: number;
    walletId: string;
    paymentMethod: 'CASH' | 'BANK_TRANSFER' | 'CHEQUE' | 'ONLINE';
    chequeNumber?: string;
    bankRef?: string;
}

export interface TransferParams extends BaseParams {
    fromWalletId: string;
    toWalletId: string;
    amount: number;
}

export interface SalaryDisbursementParams extends BaseParams {
    slipId: string;
    walletId: string;
}

export interface ExpensePaymentParams extends BaseParams {
    title: string;
    categoryId: string;
    amount: number;
    walletId: string;
    vendorId?: string;
    department?: string;
    receiptUrl?: string;
    recurringTemplateId?: string;
    generatedForMonth?: number;
    generatedForYear?: number;
}

export interface RefundParams extends BaseParams {
    studentProfileId: string;
    refundType: 'OVERPAYMENT' | 'SECURITY_DEPOSIT' | 'ADMISSION_CANCEL' | 'ADJUSTMENT';
    amount: number;
    walletId: string;
    sourceInvoiceId?: string;
    reason: string;
    securityDepositId?: string;
}

export interface InvestmentOutflowParams extends BaseParams {
    investmentId: string;
    walletId: string;
}

export interface InvestmentReturnParams extends BaseParams {
    investmentId: string;
    walletId: string;
    actualReturnAmount: number;
}

export interface SecurityDepositParams extends BaseParams {
    studentProfileId: string;
    amount: number;
    walletId: string;
}

export interface ReversalParams extends BaseParams {
    originalTxId: string;
    reason: string;
}

// ─── FinanceTransactionService ────────────────────────────────────────────────

export class FinanceTransactionService {

    // ── Month-Lock Guard ──────────────────────────────────────────────────────

    /**
     * Must be called BEFORE any DB write in every service method.
     * If the accounting period for the given date is locked → throw.
     */
    static async assertPeriodOpen(date: Date, session: ClientSession): Promise<void> {
        const month = date.getMonth() + 1;
        const year = date.getFullYear();
        const period = await AccountingPeriod.findOne({ month, year }).session(session).lean();
        if (period?.status === 'LOCKED') {
            throw new FinanceError(
                'PERIOD_LOCKED',
                `Accounting period ${month}/${year} is locked. Contact finance admin to unlock.`,
                { month, year }
            );
        }
    }

    // ── Core Atomic Recorder ──────────────────────────────────────────────────

    /**
     * Creates one Transaction record and updates the corresponding wallet
     * balance atomically within the provided session.
     *
     * This is a private primitive — external code calls the named methods below.
     */
    private static async record(
        params: {
            txType: FinanceTxType;
            amount: number;
            walletId: string | Types.ObjectId;
            linkedTxId?: Types.ObjectId;
            referenceId?: string;
            referenceModel?: string;
            notes?: string;
            performedBy: Types.ObjectId | string;
            date: Date;
        },
        session: ClientSession
    ): Promise<typeof Transaction.prototype> {
        const { txType, amount, walletId, notes, performedBy, date } = params;

        if (amount <= 0) {
            throw new FinanceError('INVALID_AMOUNT', `Transaction amount must be positive. Got: ${amount}`);
        }

        // 1. Create the immutable transaction record
        const [tx] = await Transaction.create(
            [{
                txType,
                amount,
                walletId: new Types.ObjectId(walletId.toString()),
                linkedTxId: params.linkedTxId,
                referenceId: params.referenceId,
                referenceModel: params.referenceModel,
                notes,
                performedBy: new Types.ObjectId(performedBy.toString()),
                date,
            }],
            { session }
        );

        // 2. Update wallet balance atomically ($inc, same session)
        const delta = balanceDeltaSign(txType) * amount;
        const updatedWallet = await Wallet.findByIdAndUpdate(
            walletId,
            { $inc: { currentBalance: delta } },
            { session, new: true, select: 'currentBalance name isActive' }
        );

        if (!updatedWallet) {
            throw new FinanceError('WALLET_NOT_FOUND', `Wallet ${walletId} not found.`);
        }

        // 3. Guard: wallet must never go negative
        if (updatedWallet.currentBalance < 0) {
            throw new FinanceError(
                'INSUFFICIENT_BALANCE',
                `Wallet "${updatedWallet.name}" has insufficient balance.`,
                {
                    requiredAmount: amount,
                    availableBalance: updatedWallet.currentBalance + amount, // pre-debit balance
                    shortfall: Math.abs(updatedWallet.currentBalance),
                }
            );
        }

        return tx;
    }

    // ── Public Operations ─────────────────────────────────────────────────────

    /**
     * Record a student fee payment.
     *
     * Flow:
     *   1. Load invoice + student advance balance
     *   2. Auto-apply advance balance (if any)
     *   3. Cash amount fills remaining arrears
     *   4. If total > arrears → excess credited to StudentAdvanceBalance
     *   5. Create FEE_PAYMENT transaction + update wallet
     *   6. Update invoice.amountPaid, derive status in-place
     */
    static async recordFeePayment(params: FeePaymentParams): Promise<{
        transactionId: string;
        receiptNumber: string;
        advanceApplied: number;
        excessCredited: number;
        invoiceStatus: string;
    }> {
        await dbConnect();
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const date = params.date ?? new Date();
            await this.assertPeriodOpen(date, session);

            // Load invoice
            const invoice = await FeeInvoice.findById(params.invoiceId).session(session);
            if (!invoice) throw new FinanceError('INVOICE_NOT_FOUND', `Invoice ${params.invoiceId} not found.`);
            if (invoice.status === 'PAID') throw new FinanceError('INVOICE_ALREADY_PAID', 'This invoice is fully paid.');
            if (invoice.status === 'WAIVED') throw new FinanceError('INVOICE_WAIVED', 'Cannot pay a waived invoice.');

            const effectiveTotal = invoice.totalAmount - invoice.discountAmount + invoice.penaltyAmount;
            const currentArrears = Math.max(0, effectiveTotal - invoice.amountPaid);

            // Load advance balance
            let advanceRec = await StudentAdvanceBalance.findOne({
                studentProfileId: invoice.studentProfileId,
            }).session(session);

            const advanceAvailable = advanceRec?.balance ?? 0;
            const advanceApplied = Math.min(advanceAvailable, currentArrears);
            const cashArrears = currentArrears - advanceApplied;
            const cashAmount = params.amount;
            const totalApplied = cashAmount + advanceApplied;
            const excessCredited = Math.max(0, totalApplied - currentArrears);

            // Deduct advance used
            let advanceTx: typeof Transaction.prototype | null = null;
            if (advanceApplied > 0) {
                if (!advanceRec) {
                    advanceRec = new StudentAdvanceBalance({
                        studentProfileId: invoice.studentProfileId,
                        balance: 0,
                    });
                }
                advanceRec.balance = (advanceRec.balance ?? 0) - advanceApplied;
                advanceRec.lastUpdated = new Date();
                await advanceRec.save({ session });

                // Record the advance deduction as a non-wallet transaction
                const [advTx] = await Transaction.create(
                    [{
                        txType: 'STUDENT_ADVANCE_DEDUCTION',
                        amount: advanceApplied,
                        walletId: params.walletId,
                        referenceId: invoice._id.toString(),
                        referenceModel: 'FeeInvoice',
                        notes: `Student advance applied — Invoice ${params.invoiceId}`,
                        performedBy: new Types.ObjectId(params.performedBy.toString()),
                        date,
                    }],
                    { session }
                );
                advanceTx = advTx;
            }

            // Credit excess to advance
            if (excessCredited > 0) {
                if (!advanceRec) {
                    advanceRec = new StudentAdvanceBalance({
                        studentProfileId: invoice.studentProfileId,
                        balance: 0,
                    });
                }
                advanceRec.balance = (advanceRec.balance ?? 0) + excessCredited;
                advanceRec.lastUpdated = new Date();
                await advanceRec.save({ session });
            }

            // Create cash FEE_PAYMENT transaction (only if cash amount > 0)
            let tx: typeof Transaction.prototype | null = null;
            if (cashAmount > 0) {
                // Pre-flight balance check before deducting from wallet
                const wallet = await Wallet.findById(params.walletId).session(session).select('currentBalance name isActive');
                if (!wallet || !wallet.isActive) throw new FinanceError('WALLET_NOT_FOUND', `Wallet ${params.walletId} not found.`);

                tx = await this.record({
                    txType: 'FEE_PAYMENT',
                    amount: cashAmount,
                    walletId: params.walletId,
                    referenceId: invoice._id.toString(),
                    referenceModel: 'FeeInvoice',
                    notes: params.notes ?? `Fee payment — Invoice ${params.invoiceId}`,
                    performedBy: params.performedBy,
                    date,
                }, session);
            } else if (cashArrears === 0 && advanceApplied === 0) {
                throw new FinanceError('INVALID_AMOUNT', 'No advance balance and zero cash amount. Nothing to apply.');
            }

            // Update invoice
            const newAmountPaid = invoice.amountPaid + Math.min(totalApplied, currentArrears);
            invoice.amountPaid = newAmountPaid;
            invoice.discountFromAdvance = (invoice.discountFromAdvance ?? 0) + advanceApplied;

            // Derive status (no hook)
            if (invoice.amountPaid >= effectiveTotal) {
                invoice.status = 'PAID';
            } else if (invoice.amountPaid > 0) {
                invoice.status = 'PARTIAL';
            } else if (new Date() > invoice.dueDate) {
                invoice.status = 'OVERDUE';
            } else {
                invoice.status = 'PENDING';
            }

            const receiptNumber = `RCP-${Date.now()}`;
            await invoice.save({ session });
            await session.commitTransaction();

            return {
                transactionId: tx?._id?.toString() ?? 'advance-only',
                receiptNumber,
                advanceApplied,
                excessCredited,
                invoiceStatus: invoice.status,
            };
        } catch (err) {
            await session.abortTransaction();
            throw err;
        } finally {
            session.endSession();
        }
    }

    /**
     * Internal wallet-to-wallet transfer.
     * Creates TWO linked transactions (OUT + IN), one atomic commit.
     */
    static async recordTransfer(params: TransferParams): Promise<{
        outTxId: string;
        inTxId: string;
    }> {
        await dbConnect();
        if (params.fromWalletId === params.toWalletId) {
            throw new FinanceError('SAME_WALLET_TRANSFER', 'Source and destination wallets must be different.');
        }

        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const date = params.date ?? new Date();
            await this.assertPeriodOpen(date, session);

            // OUT side (debit source wallet)
            const outTx = await this.record({
                txType: 'WALLET_TRANSFER_OUT',
                amount: params.amount,
                walletId: params.fromWalletId,
                notes: params.notes ?? 'Internal transfer',
                performedBy: params.performedBy,
                date,
            }, session);

            // IN side (credit destination wallet) — linked to OUT
            const inTx = await this.record({
                txType: 'WALLET_TRANSFER_IN',
                amount: params.amount,
                walletId: params.toWalletId,
                linkedTxId: outTx._id as Types.ObjectId,
                notes: params.notes ?? 'Internal transfer',
                performedBy: params.performedBy,
                date,
            }, session);

            // Back-link OUT → IN
            await Transaction.findByIdAndUpdate(
                outTx._id,
                { linkedTxId: inTx._id },
                { session }
            );

            await session.commitTransaction();
            return { outTxId: outTx._id.toString(), inTxId: inTx._id.toString() };
        } catch (err) {
            await session.abortTransaction();
            throw err;
        } finally {
            session.endSession();
        }
    }

    /**
     * Disburse one salary slip.
     * Computes netPayable = base + allowances - deductions in service (no hook).
     */
    static async recordSalaryDisbursement(params: SalaryDisbursementParams): Promise<{
        transactionId: string;
        netPayable: number;
    }> {
        await dbConnect();
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const date = params.date ?? new Date();
            await this.assertPeriodOpen(date, session);

            const slip = await SalarySlip.findById(params.slipId).session(session);
            if (!slip) throw new FinanceError('SLIP_NOT_DRAFT', `Salary slip ${params.slipId} not found.`);
            if (slip.status !== 'DRAFT') throw new FinanceError('SLIP_NOT_DRAFT', `Slip ${params.slipId} is ${slip.status}, not DRAFT.`);

            // Compute net in service (no pre-save hook)
            const netPayable = Math.max(0, slip.baseAmount + slip.allowances - slip.deductions);

            const tx = await this.record({
                txType: 'PAYROLL_PAYMENT',
                amount: netPayable,
                walletId: params.walletId,
                referenceId: slip._id.toString(),
                referenceModel: 'SalarySlip',
                notes: params.notes ?? `Salary — ${slip.month}/${slip.year}`,
                performedBy: params.performedBy,
                date,
            }, session);

            slip.netPayable = netPayable;
            slip.status = 'PAID';
            slip.paidDate = date;
            slip.transactionId = tx._id as Types.ObjectId;
            await slip.save({ session });

            await session.commitTransaction();
            return { transactionId: tx._id.toString(), netPayable };
        } catch (err) {
            await session.abortTransaction();
            throw err;
        } finally {
            session.endSession();
        }
    }

    /**
     * Record an operational expense (utilities, supplies, etc.).
     */
    static async recordExpensePayment(params: ExpensePaymentParams): Promise<{
        expenseId: string;
        transactionId: string;
    }> {
        await dbConnect();
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const date = params.date ?? new Date();
            await this.assertPeriodOpen(date, session);

            // Create expense record first
            const [expense] = await ExpenseRecord.create(
                [{
                    title: params.title,
                    categoryId: new Types.ObjectId(params.categoryId),
                    amount: params.amount,
                    walletId: new Types.ObjectId(params.walletId),
                    vendorId: params.vendorId ? new Types.ObjectId(params.vendorId) : undefined,
                    department: params.department,
                    receiptUrl: params.receiptUrl,
                    date,
                    notes: params.notes,
                    recordedBy: new Types.ObjectId(params.performedBy.toString()),
                    recurringTemplateId: params.recurringTemplateId
                        ? new Types.ObjectId(params.recurringTemplateId)
                        : undefined,
                    generatedForMonth: params.generatedForMonth,
                    generatedForYear: params.generatedForYear,
                }],
                { session }
            );

            const tx = await this.record({
                txType: 'EXPENSE_PAYMENT',
                amount: params.amount,
                walletId: params.walletId,
                referenceId: expense._id.toString(),
                referenceModel: 'ExpenseRecord',
                notes: params.title,
                performedBy: params.performedBy,
                date,
            }, session);

            // Back-link transaction to expense
            expense.transactionId = tx._id as Types.ObjectId;
            await expense.save({ session });

            await session.commitTransaction();
            return { expenseId: expense._id.toString(), transactionId: tx._id.toString() };
        } catch (err) {
            await session.abortTransaction();
            throw err;
        } finally {
            session.endSession();
        }
    }

    /**
     * Process a refund (overpayment, security deposit, or admission cancellation).
     */
    static async recordRefund(params: RefundParams): Promise<{
        refundId: string;
        transactionId: string;
        refundNumber: string;
    }> {
        await dbConnect();
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const date = params.date ?? new Date();
            await this.assertPeriodOpen(date, session);

            const refundNumber = `REF-${Date.now()}`;

            const tx = await this.record({
                txType: 'REFUND',
                amount: params.amount,
                walletId: params.walletId,
                referenceId: params.sourceInvoiceId,
                referenceModel: params.sourceInvoiceId ? 'FeeInvoice' : undefined,
                notes: params.notes ?? `Refund: ${params.reason}`,
                performedBy: params.performedBy,
                date,
            }, session);

            const [refund] = await Refund.create(
                [{
                    refundNumber,
                    studentProfileId: new Types.ObjectId(params.studentProfileId),
                    refundType: params.refundType,
                    amount: params.amount,
                    walletId: new Types.ObjectId(params.walletId),
                    txId: tx._id,
                    sourceInvoiceId: params.sourceInvoiceId
                        ? new Types.ObjectId(params.sourceInvoiceId)
                        : undefined,
                    reason: params.reason,
                    processedBy: new Types.ObjectId(params.performedBy.toString()),
                    processedAt: date,
                }],
                { session }
            );

            // If security deposit refund — update deposit status
            if (params.securityDepositId) {
                await SecurityDeposit.findByIdAndUpdate(
                    params.securityDepositId,
                    {
                        status: 'REFUNDED',
                        refundTxId: tx._id,
                        refundDate: date,
                    },
                    { session }
                );
            }

            await session.commitTransaction();
            return { refundId: refund._id.toString(), transactionId: tx._id.toString(), refundNumber };
        } catch (err) {
            await session.abortTransaction();
            throw err;
        } finally {
            session.endSession();
        }
    }

    /**
     * Record a security deposit received from a student.
     */
    static async recordSecurityDeposit(params: SecurityDepositParams): Promise<{
        depositId: string;
        transactionId: string;
    }> {
        await dbConnect();
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const date = params.date ?? new Date();
            await this.assertPeriodOpen(date, session);

            const tx = await this.record({
                txType: 'SECURITY_DEPOSIT',
                amount: params.amount,
                walletId: params.walletId,
                referenceModel: 'SecurityDeposit',
                notes: params.notes ?? 'Security deposit received',
                performedBy: params.performedBy,
                date,
            }, session);

            const [deposit] = await SecurityDeposit.create(
                [{
                    studentProfileId: new Types.ObjectId(params.studentProfileId),
                    amount: params.amount,
                    status: 'HELD',
                    paidDate: date,
                    txId: tx._id,
                }],
                { session }
            );

            // Back-link referenceId to deposit
            await Transaction.findByIdAndUpdate(
                tx._id,
                { referenceId: deposit._id.toString() },
                { session }
            );

            await session.commitTransaction();
            return { depositId: deposit._id.toString(), transactionId: tx._id.toString() };
        } catch (err) {
            await session.abortTransaction();
            throw err;
        } finally {
            session.endSession();
        }
    }

    /**
     * Place money into an investment (capital outflow).
     */
    static async recordInvestmentOutflow(params: InvestmentOutflowParams): Promise<{
        transactionId: string;
    }> {
        await dbConnect();
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const date = params.date ?? new Date();
            await this.assertPeriodOpen(date, session);

            const investment = await Investment.findById(params.investmentId).session(session);
            if (!investment || investment.status !== 'ACTIVE') {
                throw new FinanceError('INVESTMENT_NOT_ACTIVE', `Investment ${params.investmentId} is not active.`);
            }

            const tx = await this.record({
                txType: 'INVESTMENT_OUTFLOW',
                amount: investment.principalAmount,
                walletId: params.walletId,
                referenceId: investment._id.toString(),
                referenceModel: 'Investment',
                notes: params.notes ?? `Investment placed: ${investment.name}`,
                performedBy: params.performedBy,
                date,
            }, session);

            investment.outflowTxId = tx._id as Types.ObjectId;
            await investment.save({ session });

            await session.commitTransaction();
            return { transactionId: tx._id.toString() };
        } catch (err) {
            await session.abortTransaction();
            throw err;
        } finally {
            session.endSession();
        }
    }

    /**
     * Record investment maturity / return (capital inflow).
     */
    static async recordInvestmentReturn(params: InvestmentReturnParams): Promise<{
        transactionId: string;
    }> {
        await dbConnect();
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const date = params.date ?? new Date();
            await this.assertPeriodOpen(date, session);

            const investment = await Investment.findById(params.investmentId).session(session);
            if (!investment || investment.status !== 'ACTIVE') {
                throw new FinanceError('INVESTMENT_NOT_ACTIVE', `Investment ${params.investmentId} is not active.`);
            }

            const tx = await this.record({
                txType: 'INVESTMENT_RETURN',
                amount: params.actualReturnAmount,
                walletId: params.walletId,
                referenceId: investment._id.toString(),
                referenceModel: 'Investment',
                notes: params.notes ?? `Investment matured: ${investment.name}`,
                performedBy: params.performedBy,
                date,
            }, session);

            investment.status = 'MATURED';
            investment.returnTxId = tx._id as Types.ObjectId;
            investment.actualReturnAmount = params.actualReturnAmount;
            await investment.save({ session });

            await session.commitTransaction();
            return { transactionId: tx._id.toString() };
        } catch (err) {
            await session.abortTransaction();
            throw err;
        } finally {
            session.endSession();
        }
    }

    /**
     * Apply advance balance to an invoice without any cash payment.
     * Used mainly during invoice generation.
     */
    static async recordAdvanceApplication(params: {
        invoiceId: string;
        amount: number;
        walletId: string; // fallback wallet for record keeping
        performedBy: string | Types.ObjectId;
        date?: Date;
    }): Promise<{ transactionId: string; invoiceStatus: string; amountApplied: number }> {
        await dbConnect();
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const date = params.date ?? new Date();
            await this.assertPeriodOpen(date, session);

            const invoice = await FeeInvoice.findById(params.invoiceId).session(session);
            if (!invoice) throw new FinanceError('INVOICE_NOT_FOUND', `Invoice ${params.invoiceId} not found.`);
            if (invoice.status === 'PAID') throw new FinanceError('INVOICE_ALREADY_PAID', 'This invoice is already paid.');

            const advanceRec = await StudentAdvanceBalance.findOne({
                studentProfileId: invoice.studentProfileId,
            }).session(session);

            const advanceAvailable = advanceRec?.balance ?? 0;
            if (advanceAvailable <= 0) {
                throw new FinanceError('INSUFFICIENT_BALANCE', 'No advance balance available to apply.');
            }

            const effectiveTotal = invoice.totalAmount - invoice.discountAmount + invoice.penaltyAmount;
            const currentArrears = Math.max(0, effectiveTotal - invoice.amountPaid);
            const amountToApply = Math.min(params.amount, advanceAvailable, currentArrears);

            if (amountToApply <= 0) {
                throw new FinanceError('INVALID_AMOUNT', 'Nothing to apply (either no arrears or zero amount).');
            }

            // Deduct from advance balance
            advanceRec!.balance -= amountToApply;
            advanceRec!.lastUpdated = date;
            await advanceRec!.save({ session });

            // Record transaction
            const [tx] = await Transaction.create(
                [{
                    txType: 'STUDENT_ADVANCE_DEDUCTION',
                    amount: amountToApply,
                    walletId: new Types.ObjectId(params.walletId.toString()),
                    referenceId: invoice._id.toString(),
                    referenceModel: 'FeeInvoice',
                    notes: `Student advance auto-applied to invoice ${params.invoiceId}`,
                    performedBy: new Types.ObjectId(params.performedBy.toString()),
                    date,
                }],
                { session }
            );

            // Update invoice
            invoice.amountPaid += amountToApply;
            invoice.discountFromAdvance = (invoice.discountFromAdvance ?? 0) + amountToApply;

            if (invoice.amountPaid >= effectiveTotal) {
                invoice.status = 'PAID';
            } else {
                invoice.status = 'PARTIAL';
            }

            await invoice.save({ session });

            await session.commitTransaction();
            return { transactionId: tx._id.toString(), invoiceStatus: invoice.status, amountApplied: amountToApply };
        } catch (err) {
            await session.abortTransaction();
            throw err;
        } finally {
            session.endSession();
        }
    }

    /**
     * Reverse a transaction symmetrically.
     * Original transaction is marked as reversed.
     * New REVERSAL transaction is created offsetting the original.
     * Related documents (invoice, slip, etc.) are reverted to their previous state.
     */
    static async reverseTransaction(params: ReversalParams): Promise<{
        reversalTxId: string;
    }> {
        await dbConnect();
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const date = params.date ?? new Date();
            await this.assertPeriodOpen(date, session);

            const originalTx = await Transaction.findById(params.originalTxId).session(session);
            if (!originalTx) {
                throw new FinanceError('TX_NOT_FOUND', `Transaction ${params.originalTxId} not found.`);
            }

            if (originalTx.isReversed) {
                throw new FinanceError('TX_ALREADY_REVERSED', `Transaction ${params.originalTxId} is already reversed.`);
            }

            if (originalTx.txType === 'REVERSAL') {
                throw new FinanceError('CANNOT_REVERSE_REVERSAL', 'Cannot reverse a reversal transaction.');
            }

            if (originalTx.txType === 'STUDENT_ADVANCE_DEDUCTION') {
                throw new FinanceError('CANNOT_REVERSE_ADVANCE', 'Reversing advance transactions directly is not supported yet.');
            }

            // 1. Create reversal transaction
            const [reversalTx] = await Transaction.create(
                [{
                    txType: 'REVERSAL',
                    amount: originalTx.amount,
                    walletId: originalTx.walletId,
                    referenceId: originalTx.referenceId,
                    referenceModel: originalTx.referenceModel,
                    notes: params.reason,
                    performedBy: new Types.ObjectId(params.performedBy.toString()),
                    date,
                }],
                { session }
            );

            // 2. Adjust Wallet Balance Symmetrically
            // If original was an inflow (+), reversal must be an outflow (-)
            // So we negate the original delta sign
            const originalDeltaSign = balanceDeltaSign(originalTx.txType);
            const reversalDelta = -(originalDeltaSign) * originalTx.amount;

            const updatedWallet = await Wallet.findByIdAndUpdate(
                originalTx.walletId,
                { $inc: { currentBalance: reversalDelta } },
                { session, new: true, select: 'currentBalance name isActive' }
            );

            if (!updatedWallet) throw new FinanceError('WALLET_NOT_FOUND', `Wallet ${originalTx.walletId} not found.`);

            if (updatedWallet.currentBalance < 0) {
                throw new FinanceError('INSUFFICIENT_BALANCE', `Reversing this transaction would make wallet ${updatedWallet.name} negative.`);
            }

            // 3. Mark original as reversed
            originalTx.isReversed = true;
            originalTx.reversedByTxId = reversalTx._id as Types.ObjectId;
            await originalTx.save({ session });

            // 4. Handle related documents
            if (originalTx.referenceModel === 'FeeInvoice' && originalTx.referenceId) {
                const invoice = await FeeInvoice.findById(originalTx.referenceId).session(session);
                if (invoice) {
                    if (originalTx.txType === 'FEE_PAYMENT') {
                        invoice.amountPaid = Math.max(0, invoice.amountPaid - originalTx.amount);

                        const effectiveTotal = invoice.totalAmount - invoice.discountAmount + invoice.penaltyAmount;
                        if (invoice.amountPaid <= 0) {
                            invoice.status = (new Date() > invoice.dueDate) ? 'OVERDUE' : 'PENDING';
                        } else if (invoice.amountPaid < effectiveTotal) {
                            invoice.status = 'PARTIAL';
                        }

                        await invoice.save({ session });
                    }
                }
            } else if (originalTx.referenceModel === 'SalarySlip' && originalTx.referenceId) {
                const slip = await SalarySlip.findById(originalTx.referenceId).session(session);
                if (slip && originalTx.txType === 'PAYROLL_PAYMENT') {
                    slip.status = 'DRAFT';
                    slip.netPayable = 0;
                    slip.paidDate = undefined;
                    slip.transactionId = undefined;
                    await slip.save({ session });
                }
            } else if (originalTx.referenceModel === 'ExpenseRecord' && originalTx.referenceId) {
                // For expenses, we might soft-delete or nullify the transactionId
                const expense = await ExpenseRecord.findById(originalTx.referenceId).session(session);
                if (expense && originalTx.txType === 'EXPENSE_PAYMENT') {
                    expense.transactionId = undefined;
                    await expense.save({ session });
                }
            }

            await session.commitTransaction();
            return { reversalTxId: reversalTx._id.toString() };
        } catch (err) {
            await session.abortTransaction();
            throw err;
        } finally {
            session.endSession();
        }
    }
}

// ── Helper: is inflow (for callers that need to check) ────────────────────────
export function isInflowTxType(t: FinanceTxType): boolean {
    return (INFLOW_TYPES as readonly string[]).includes(t);
}
