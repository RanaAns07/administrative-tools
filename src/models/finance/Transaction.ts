/**
 * @file Transaction.ts
 * @description Khatta Engine — Financial Transaction Record (Pure Data Model)
 *
 * ARCHITECTURE RULE: This model has ZERO side effects.
 * No pre('save') hooks. No wallet balance mutations. No middleware logic.
 *
 * Every transaction record is immutable once created.
 * Reversals are recorded as new transactions, not edits to existing ones.
 *
 * All balance changes happen exclusively in FinanceTransactionService
 * using MongoDB $inc inside client sessions.
 *
 * Transaction Types (LOCKED — use transactionTypes.ts enum only):
 *
 *   INFLOWS (wallet balance increases):
 *     FEE_PAYMENT        — student fee receipt
 *     SECURITY_DEPOSIT   — refundable deposit
 *     INVESTMENT_RETURN  — investment maturity
 *
 *   OUTFLOWS (wallet balance decreases):
 *     EXPENSE_PAYMENT    — operational expense
 *     PAYROLL_PAYMENT    — salary disbursement
 *     REFUND             — money returned to student
 *     INVESTMENT_OUTFLOW — capital placed in investment
 *
 *   TRANSFERS (internal, no net effect):
 *     WALLET_TRANSFER_OUT — debit side
 *     WALLET_TRANSFER_IN  — credit side (linked to OUT via linkedTxId)
 */

import mongoose, { Schema, Document, Model, Types } from 'mongoose';
import { ALL_TX_TYPES, FinanceTxType } from '@/lib/finance/transactionTypes';

export interface ITransaction extends Document {
    /** Transaction sub-type (from locked enum) */
    txType: FinanceTxType;
    /** Amount in PKR. Always positive. */
    amount: number;
    /** Effective date of the transaction */
    date: Date;
    /** The wallet this transaction affects */
    walletId: Types.ObjectId;
    /**
     * For WALLET_TRANSFER_OUT/IN pairs: links to the counterpart transaction.
     * OUT links → IN._id; IN links → OUT._id (set after both are created).
     */
    linkedTxId?: Types.ObjectId;
    /** The source document model name (e.g. 'FeeInvoice', 'SalarySlip') */
    referenceModel?: string;
    /** The source document's _id as a string */
    referenceId?: string;
    /** Free-text note from the finance officer */
    notes?: string;
    /** The system user who initiated this transaction */
    performedBy: Types.ObjectId;
    /** Indicates if this transaction has been fully reversed */
    isReversed?: boolean;
    /** The ID of the transaction that reversed this one */
    reversedByTxId?: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const TransactionSchema = new Schema<ITransaction>(
    {
        txType: {
            type: String,
            required: [true, 'Transaction type (txType) is required.'],
            enum: {
                values: ALL_TX_TYPES as unknown as string[],
                message: 'txType must be one of the permitted FinanceTxType values.',
            },
        },
        amount: {
            type: Number,
            required: [true, 'Transaction amount is required.'],
            min: [0.01, 'Amount must be greater than zero.'],
        },
        date: {
            type: Date,
            default: Date.now,
        },
        walletId: {
            type: Schema.Types.ObjectId,
            ref: 'Wallet',
            required: [true, 'A wallet reference (walletId) is required.'],
        },
        linkedTxId: {
            type: Schema.Types.ObjectId,
            ref: 'Transaction',
            default: null,
        },
        referenceModel: {
            type: String,
            trim: true,
            default: null,
        },
        referenceId: {
            type: String,
            trim: true,
            default: null,
        },
        notes: {
            type: String,
            trim: true,
            maxlength: [1000, 'Notes must not exceed 1000 characters.'],
        },
        performedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'performedBy (the recording user) is required.'],
        },
        isReversed: {
            type: Boolean,
            default: false,
        },
        reversedByTxId: {
            type: Schema.Types.ObjectId,
            ref: 'Transaction',
            default: null,
        },
    },
    {
        timestamps: true,
        collection: 'finance_transactions',
    }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────

// Primary query: all transactions for a wallet, newest first
TransactionSchema.index({ walletId: 1, date: -1 });
// Filter by type for reports
TransactionSchema.index({ txType: 1 });
// Look up by source document
TransactionSchema.index({ referenceModel: 1, referenceId: 1 });
// Audit trail: which transactions did a specific user make?
TransactionSchema.index({ performedBy: 1 });
// Date-range queries for period reports
TransactionSchema.index({ date: -1 });
// Transfer pair lookup
TransactionSchema.index({ linkedTxId: 1 });

// ─── Model Export ─────────────────────────────────────────────────────────────

const Transaction: Model<ITransaction> =
    mongoose.models.Transaction ||
    mongoose.model<ITransaction>('Transaction', TransactionSchema);

export default Transaction;
