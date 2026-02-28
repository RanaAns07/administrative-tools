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
    title: string;
    categoryId: Types.ObjectId;
    amount: number;
    walletId: Types.ObjectId;
    vendorId?: Types.ObjectId;
    department?: string;
    receiptUrl?: string;
    date: Date;
    notes?: string;
    recordedBy: Types.ObjectId;
    transactionId?: Types.ObjectId;
    /** Links to a RecurringExpense template if auto-generated */
    recurringTemplateId?: Types.ObjectId;
    /** Month this recurring expense was generated for (dedup key) */
    generatedForMonth?: number;
    /** Year this recurring expense was generated for (dedup key) */
    generatedForYear?: number;
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
        vendorId: {
            type: Schema.Types.ObjectId,
            ref: 'Vendor',
            default: null,
        },
        department: {
            type: String,
            trim: true,
            maxlength: [150, 'Department name must not exceed 150 characters.'],
        },
        receiptUrl: { type: String, trim: true },
        date: { type: Date, default: Date.now },
        notes: { type: String, trim: true, maxlength: [2000, 'Notes must not exceed 2000 characters.'] },
        recordedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'recordedBy (User reference) is required.'],
        },
        transactionId: { type: Schema.Types.ObjectId, ref: 'Transaction' },
        recurringTemplateId: { type: Schema.Types.ObjectId, ref: 'RecurringExpense', default: null },
        generatedForMonth: { type: Number, min: 1, max: 12 },
        generatedForYear: { type: Number },
    },
    {
        timestamps: true,
        collection: 'finance_expense_records',
    }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────

ExpenseRecordSchema.index({ date: -1 });
ExpenseRecordSchema.index({ categoryId: 1 });
ExpenseRecordSchema.index({ walletId: 1 });
ExpenseRecordSchema.index({ recordedBy: 1 });
ExpenseRecordSchema.index({ department: 1 });
ExpenseRecordSchema.index({ vendorId: 1 });
// Prevent double-generation of the same recurring expense
ExpenseRecordSchema.index(
    { recurringTemplateId: 1, generatedForMonth: 1, generatedForYear: 1 },
    { unique: true, sparse: true }  // sparse: ignore docs where recurringTemplateId is null
);

// ─── Model Export ─────────────────────────────────────────────────────────────

const ExpenseRecord: Model<IExpenseRecord> =
    mongoose.models.ExpenseRecord ||
    mongoose.model<IExpenseRecord>('ExpenseRecord', ExpenseRecordSchema);

export default ExpenseRecord;
