import mongoose, { ClientSession, Types } from 'mongoose';
import FeeInvoice, { IFeeInvoice } from '@/models/finance/FeeInvoice';
import FeePayment, { IFeePayment } from '@/models/finance/FeePayment';
import InstallmentPlan, { IInstallmentPlan } from '@/models/finance/InstallmentPlan';
import Wallet from '@/models/finance/Wallet';
import Transaction from '@/models/finance/Transaction';
import StudentAdvanceBalance from '@/models/finance/StudentAdvanceBalance';
import dbConnect from '@/lib/mongodb';
import { FinanceError } from './FinanceError';

/**
 * FinanceTransactionService
 * 
 * Handles core financial logic including fee payment processing and departmental reporting.
 * Follows strict cascading allocation rules and ensures atomicity via MongoDB transactions.
 */
export class FinanceTransactionService {

    /**
     * Records a fee payment from a student.
     * 1. Validates invoice and wallet.
     * 2. Updates wallet balance ($inc).
     * 3. Allocates cash to penalties first, then principal (and installments).
     * 4. Handles overpayment by crediting StudentAdvanceBalance.
     * 5. Creates Transaction and FeePayment records.
     */
    static async recordFeePayment(payload: {
        invoiceId: string;
        amount: number;
        walletId: string;
        paymentMethod: string;
        chequeNumber?: string;
        bankRef?: string;
        date?: Date;
        notes?: string;
        performedBy: string;
    }) {
        await dbConnect();
        const session = await mongoose.connection.startSession();
        session.startTransaction();

        try {
            // 1. Validate Core Entities
            const [invoice, wallet] = await Promise.all([
                FeeInvoice.findById(payload.invoiceId).session(session),
                Wallet.findById(payload.walletId).session(session)
            ]);

            if (!invoice) throw new FinanceError('INVOICE_NOT_FOUND', `Invoice ${payload.invoiceId} not found.`);
            if (!wallet || !wallet.isActive) throw new FinanceError('WALLET_NOT_FOUND', 'Wallet is invalid or inactive.');
            if (invoice.status === 'PAID') throw new FinanceError('INVOICE_ALREADY_PAID', 'This invoice is already fully paid.');

            const paymentDate = payload.date || new Date();
            const arrearsBefore = invoice.getArrears();
            
            // 2. Update Wallet Balance
            await Wallet.updateOne(
                { _id: wallet._id },
                { $inc: { currentBalance: payload.amount } },
                { session }
            );

            // 3. Cascading Allocation Logic
            let remainingToAllocate = payload.amount;
            
            // 3a. Pay Penalty First
            const pendingPenalty = invoice.penaltyAmount - invoice.penaltyPaid;
            const penaltyAllocated = Math.min(remainingToAllocate, pendingPenalty);
            remainingToAllocate -= penaltyAllocated;

            // 3b. Pay Principal (Installments vs Straight)
            let principalAllocated = 0;
            const excessToCredit = Math.max(0, remainingToAllocate - arrearsBefore + pendingPenalty);
            const actualPrincipalToPay = Math.min(remainingToAllocate, arrearsBefore - pendingPenalty);
            
            remainingToAllocate -= actualPrincipalToPay;
            principalAllocated = actualPrincipalToPay;

            // Update Installment Plan if it exists
            const installmentPlan = await InstallmentPlan.findOne({
                feeInvoice: invoice._id,
                isCompleted: false
            }).session(session);

            if (installmentPlan) {
                let tempPrincipal = principalAllocated;
                for (const inst of installmentPlan.installments) {
                    if (tempPrincipal <= 0) break;
                    if (inst.isPaid) continue;

                    const instArrears = inst.amount - inst.paidAmount;
                    const toApply = Math.min(tempPrincipal, instArrears);

                    inst.paidAmount += toApply;
                    tempPrincipal -= toApply;

                    if (inst.paidAmount >= inst.amount) {
                        inst.isPaid = true;
                        inst.paidAt = paymentDate;
                    }
                }
                installmentPlan.isCompleted = installmentPlan.installments.every(i => i.isPaid);
                await installmentPlan.save({ session });
            }

            // 4. Handle Overpayment (Credit to StudentAdvanceBalance)
            if (excessToCredit > 0) {
                await StudentAdvanceBalance.updateOne(
                    { studentProfileId: invoice.studentProfileId },
                    { 
                        $inc: { balance: excessToCredit },
                        $set: { lastUpdated: new Date() } 
                    },
                    { upsert: true, session }
                );
            }

            // 5. Update Invoice Totals & Status
            invoice.penaltyPaid += penaltyAllocated;
            invoice.amountPaid += principalAllocated;
            
            const remainingArrears = invoice.getArrears();
            if (remainingArrears <= 0) {
                invoice.status = 'PAID';
            } else if (invoice.amountPaid > 0 || invoice.penaltyPaid > 0) {
                invoice.status = 'PARTIAL';
            }

            await invoice.save({ session });

            // 6. Create Transaction (The Khatta Record)
            const [tx] = await Transaction.create([{
                txType: 'FEE_PAYMENT',
                amount: payload.amount,
                date: paymentDate,
                walletId: wallet._id,
                referenceModel: 'FeeInvoice',
                referenceId: invoice._id.toString(),
                notes: payload.notes,
                performedBy: new Types.ObjectId(payload.performedBy)
            }], { session });

            // 7. Create FeePayment (The Student Receipt)
            const [receipt] = await FeePayment.create([{
                receiptNumber: `RCP-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                feeInvoice: invoice._id,
                amount: payload.amount,
                allocation: {
                    principalAmount: principalAllocated,
                    penaltyAmount: penaltyAllocated
                },
                paymentMode: payload.paymentMethod,
                paymentDate: paymentDate,
                receivedBy: payload.performedBy,
                status: 'APPROVED',
                notes: payload.notes
            }], { session });

            await session.commitTransaction();
            
            return {
                receiptNumber: receipt.receiptNumber,
                invoiceStatus: invoice.status,
                advanceApplied: 0,
                excessCredited: excessToCredit,
                transactionId: tx._id
            };

        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }

    /**
     * Automatically applies a student's advance balance to a new invoice.
     */
    static async recordAdvanceApplication(payload: {
        invoiceId: string;
        amount: number;
        walletId: string; // Used for transaction record even if no cash moves
        performedBy: string;
    }) {
        await dbConnect();
        const session = await mongoose.connection.startSession();
        session.startTransaction();

        try {
            const invoice = await FeeInvoice.findById(payload.invoiceId).session(session);
            if (!invoice) throw new FinanceError('INVOICE_NOT_FOUND');

            const advance = await StudentAdvanceBalance.findOne({ studentProfileId: invoice.studentProfileId }).session(session);
            if (!advance || advance.balance <= 0) {
                throw new FinanceError('INSUFFICIENT_BALANCE', 'Student has no advance balance to apply.');
            }

            const arrears = invoice.getArrears();
            const amountToApply = Math.min(advance.balance, arrears, payload.amount);

            if (amountToApply <= 0) {
                await session.abortTransaction();
                return { amountApplied: 0, invoiceStatus: invoice.status };
            }

            // Deduct from advance
            advance.balance -= amountToApply;
            advance.lastUpdated = new Date();
            await advance.save({ session });

            // Apply to invoice (Principal only, we don't auto-apply advance to penalties usually)
            invoice.amountPaid += amountToApply;
            invoice.discountFromAdvance += amountToApply;
            
            if (invoice.getArrears() <= 0) {
                invoice.status = 'PAID';
            } else {
                invoice.status = 'PARTIAL';
            }
            await invoice.save({ session });

            // Record Adjustment Transaction
            const [tx] = await Transaction.create([{
                txType: 'STUDENT_ADVANCE_DEDUCTION',
                amount: amountToApply,
                date: new Date(),
                walletId: new Types.ObjectId(payload.walletId),
                referenceModel: 'FeeInvoice',
                referenceId: invoice._id.toString(),
                notes: 'Automatic advance balance application',
                performedBy: new Types.ObjectId(payload.performedBy)
            }], { session });

            await session.commitTransaction();
            return {
                amountApplied: amountToApply,
                invoiceStatus: invoice.status,
                transactionId: tx._id
            };

        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }

    /**
     * Backward compatibility helper
     */
    static async processFeePayment(payload: any) {
        return this.recordFeePayment({
            ...payload,
            paymentMethod: payload.paymentMode
        });
    }

    /**
     * Generates a real-time, departmental finance report using a multi-stage aggregation pipeline.
     */
    static async generateDepartmentalFinanceReport() {
        await dbConnect();

        const pipeline: any[] = [
            {
                $lookup: {
                    from: 'university_students',
                    localField: 'studentProfileId',
                    foreignField: '_id',
                    as: 'student'
                }
            },
            { $unwind: '$student' },
            {
                $lookup: {
                    from: 'university_batches',
                    localField: 'student.batchId',
                    foreignField: '_id',
                    as: 'batch'
                }
            },
            { $unwind: '$batch' },
            {
                $lookup: {
                    from: 'university_programs',
                    localField: 'batch.programId',
                    foreignField: '_id',
                    as: 'program'
                }
            },
            { $unwind: '$program' },
            {
                $lookup: {
                    from: 'university_departments',
                    localField: 'program.departmentId',
                    foreignField: '_id',
                    as: 'department'
                }
            },
            { $unwind: '$department' },
            {
                $group: {
                    _id: '$department._id',
                    departmentName: { $first: '$department.name' },
                    totalExpectedFee: { 
                        $sum: { $subtract: ['$totalAmount', '$discountAmount'] } 
                    },
                    totalFeeEarned: { $sum: '$amountPaid' },
                    totalFinesImposed: { $sum: '$penaltyAmount' },
                    totalFinesCollected: { $sum: '$penaltyPaid' },
                    totalStudents: { $addToSet: '$studentProfileId' },
                    invoiceIds: { $push: '$_id' }
                }
            },
            {
                $project: {
                    departmentName: 1,
                    totalExpectedFee: 1,
                    totalFeeEarned: 1,
                    totalFinesImposed: 1,
                    totalFinesCollected: 1,
                    pendingReceivables: { $subtract: ['$totalExpectedFee', '$totalFeeEarned'] },
                    outstandingFines: { $subtract: ['$totalFinesImposed', '$totalFinesCollected'] },
                    totalStudents: { $size: '$totalStudents' },
                    invoiceIds: 1
                }
            },
            {
                $lookup: {
                    from: 'installmentplans',
                    let: { ids: '$invoiceIds' },
                    pipeline: [
                        { 
                            $match: { 
                                $expr: { 
                                    $and: [
                                        { $in: ['$feeInvoice', '$$ids'] },
                                        { $eq: ['$isCompleted', false] }
                                    ]
                                } 
                            } 
                        },
                        { $count: 'activeCount' }
                    ],
                    as: 'installments'
                }
            },
            {
                $project: {
                    departmentName: 1,
                    totalExpectedFee: 1,
                    totalFeeEarned: 1,
                    pendingReceivables: 1,
                    totalFinesImposed: 1,
                    totalFinesCollected: 1,
                    outstandingFines: 1,
                    totalStudents: 1,
                    activeInstallmentPlans: { 
                        $ifNull: [{ $arrayElemAt: ['$installments.activeCount', 0] }, 0] 
                    }
                }
            },
            { $sort: { departmentName: 1 } }
        ];

        return await FeeInvoice.aggregate(pipeline);
    }
}
