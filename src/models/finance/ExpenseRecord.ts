/**
 * @file ExpenseRecord.ts
 * @description Khatta Expense Engine — Operational Expense Record
 *
 * An ExpenseRecord is the paper trail for any money spent from a university
 * wallet on day-to-day operations (utilities, stationery, repairs, etc.).
 *
 * MONEY-OUT FLOW:
 *   POST /api/finance/expenses
 *     → creates ExpenseRecord (this document)
 *     → creates Transaction (type: OUT, referenceType: EXPENSE_RECORD)
 *     → Transaction.pre('save') decrements Wallet.currentBalance
 *
 * The ExpenseRecord is intentionally delinked from Chart of Accounts.
 * Revenue/expense categorisation is handled by linking to a Category
 * (type: EXPENSE) from the Khatta Category collection.
 *
 * Receipt storage:
 *   receiptUrl stores the public URL of a photo/scan uploaded to S3 or
 *   Cloudinary. The upload itself is handled by a separate upload endpoint.
 */

import mongoose, { Schema, Document, Model, Types } from 'mongoose';

// ─── TypeScript Interface ─────────────────────────────────────────────────────

export interface IExpenseRecord extends Document {
    /**
     * Short, human-readable description shown in reports and dashboards.
     * e.g. 'March Electricity Bill', 'Whiteboard Markers × 24'
     */
    title: string;
    /**
     * Category must be of type 'EXPENSE'.
     * Validated in the API route, not at the schema level, to keep the
     * model decoupled and avoid an async validator here.
     */
    categoryId: Types.ObjectId;
    /** Amount in PKR (or wallet base currency) */
    amount: number;
    /** The wallet money was paid FROM */
    walletId: Types.ObjectId;
    /**
     * Optional URL to the receipt image or PDF stored in S3 / Cloudinary.
     * Enables a paperless audit trail.
     */
    receiptUrl?: string;
    /** Effective date of the expense */
    date: Date;
    /** Optional free-text notes for additional context */
    notes?: string;
    /** The user (clerk/admin) who entered this expense */
    recordedBy: Types.ObjectId;
    /** Backref to the Transaction created automatically during POST */
    transactionId?: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

// ─── Schema ───────────────────────────────────────────────────────────────────

const ExpenseRecordSchema = new Schema<IExpenseRecord>(
    {
        title: {
            type: String,
            required: [true, 'Expense title is required.'],
            trim: true,
            maxlength: [300, 'Title must not exceed 300 characters.'],
        },
        categoryId: {
            type: Schema.Types.ObjectId,
            ref: 'Category',
            required: [true, 'Category reference (categoryId) is required.'],
        },
        amount: {
            type: Number,
            required: [true, 'Amount is required.'],
            min: [0.01, 'Expense amount must be greater than 0.'],
        },
        walletId: {
            type: Schema.Types.ObjectId,
            ref: 'Wallet',
            required: [true, 'Wallet reference (walletId) is required.'],
        },
        receiptUrl: {
            type: String,
            trim: true,
        },
        date: {
            type: Date,
            default: Date.now,
        },
        notes: {
            type: String,
            trim: true,
            maxlength: [2000, 'Notes must not exceed 2000 characters.'],
        },
        recordedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'recordedBy (User reference) is required.'],
        },
        transactionId: {
            type: Schema.Types.ObjectId,
            ref: 'Transaction',
        },
    },
    {
        timestamps: true,
        collection: 'finance_expense_records',
    }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────

// Most common dashboard query: all expenses by date descending
ExpenseRecordSchema.index({ date: -1 });
// Category breakdown reports
ExpenseRecordSchema.index({ categoryId: 1 });
// Wallet-level spending view
ExpenseRecordSchema.index({ walletId: 1 });
// Audit trail by recorder
ExpenseRecordSchema.index({ recordedBy: 1 });

// ─── Model Export ─────────────────────────────────────────────────────────────

const ExpenseRecord: Model<IExpenseRecord> =
    mongoose.models.ExpenseRecord ||
    mongoose.model<IExpenseRecord>('ExpenseRecord', ExpenseRecordSchema);

export default ExpenseRecord;
