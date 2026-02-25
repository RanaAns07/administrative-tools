import mongoose, { Schema, Document, Types } from 'mongoose';

export type JournalEntryStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'POSTED' | 'REJECTED';
export type JournalEntrySource =
    | 'MANUAL'
    | 'PAYROLL'
    | 'FEE_PAYMENT'
    | 'FEE_REVERSAL'
    | 'SCHOLARSHIP'
    | 'DEPRECIATION'
    | 'REFUND'
    | 'AP_PAYMENT'
    | 'AR_PAYMENT';

export interface IJournalLine {
    account: Types.ObjectId;
    accountCode?: string;
    accountName?: string;
    debit: number;
    credit: number;
    narration?: string;
}

export interface IJournalEntry extends Document {
    entryNumber: string;          // Auto-generated: JE-2025-00001
    entryDate: Date;
    description: string;
    reference?: string;
    source: JournalEntrySource;
    status: JournalEntryStatus;
    lines: IJournalLine[];
    totalDebit: number;
    totalCredit: number;
    accountingPeriod?: Types.ObjectId;
    fiscalYear?: Types.ObjectId;
    submittedBy: string;          // userId
    submittedAt?: Date;
    approvedBy?: string;          // userId
    approvedAt?: Date;
    postedBy?: string;
    postedAt?: Date;
    rejectedBy?: string;
    rejectedAt?: Date;
    rejectionReason?: string;
    attachments?: string[];
    createdAt: Date;
    updatedAt: Date;
}

const JournalLineSchema = new Schema<IJournalLine>(
    {
        account: { type: Schema.Types.ObjectId, ref: 'ChartOfAccount', required: true },
        accountCode: { type: String },
        accountName: { type: String },
        debit: { type: Number, default: 0, min: 0 },
        credit: { type: Number, default: 0, min: 0 },
        narration: { type: String },
    },
    { _id: true }
);

const JournalEntrySchema = new Schema<IJournalEntry>(
    {
        entryNumber: { type: String, unique: true, trim: true },
        entryDate: { type: Date, required: true },
        description: { type: String, required: true, trim: true },
        reference: { type: String, trim: true },
        source: {
            type: String,
            enum: ['MANUAL', 'PAYROLL', 'FEE_PAYMENT', 'FEE_REVERSAL', 'SCHOLARSHIP', 'DEPRECIATION', 'REFUND', 'AP_PAYMENT', 'AR_PAYMENT'],
            default: 'MANUAL',
        },
        status: {
            type: String,
            enum: ['DRAFT', 'PENDING_APPROVAL', 'POSTED', 'REJECTED'],
            default: 'DRAFT',
        },
        lines: { type: [JournalLineSchema], required: true },
        totalDebit: { type: Number, default: 0 },
        totalCredit: { type: Number, default: 0 },
        accountingPeriod: { type: Schema.Types.ObjectId, ref: 'AccountingPeriod' },
        fiscalYear: { type: Schema.Types.ObjectId, ref: 'FiscalYear' },
        submittedBy: { type: String, required: true },
        submittedAt: { type: Date },
        approvedBy: { type: String },
        approvedAt: { type: Date },
        postedBy: { type: String },
        postedAt: { type: Date },
        rejectedBy: { type: String },
        rejectedAt: { type: Date },
        rejectionReason: { type: String },
        attachments: [{ type: String }],
    },
    { timestamps: true }
);

// IMMUTABILITY: prevent modifications to POSTED entries
// Exception: the transition fields (status, approvedBy, postedBy, etc.) are
// allowed because they are written on the very save that moves the JE to POSTED.
// On any *subsequent* save, those fields won't be dirty and the check still protects.
JournalEntrySchema.pre('save', async function () {
    if (!this.isNew && this.status === 'POSTED') {
        const modifiedFields = this.modifiedPaths();
        const allowedModifications = [
            'updatedAt',
            // State-transition fields — written on the save that first posts the entry
            'status', 'approvedBy', 'approvedAt', 'postedBy', 'postedAt',
            // Rejection fields are set when rejecting, not when posting, but keep symmetric
            'rejectedBy', 'rejectedAt', 'rejectionReason',
            // Submission fields
            'submittedBy', 'submittedAt',
        ];
        const disallowedModifications = modifiedFields.filter(
            (field: string) => !allowedModifications.includes(field)
        );
        if (disallowedModifications.length > 0) {
            throw new Error('IMMUTABILITY_VIOLATION: Posted journal entries cannot be modified.');
        }
    }
});

JournalEntrySchema.index({ entryNumber: 1 }, { unique: true });
JournalEntrySchema.index({ entryDate: 1 });
JournalEntrySchema.index({ status: 1 });
JournalEntrySchema.index({ accountingPeriod: 1 });
JournalEntrySchema.index({ source: 1 });

const JournalEntry =
    mongoose.models.JournalEntry ||
    mongoose.model<IJournalEntry>('JournalEntry', JournalEntrySchema);

export default JournalEntry;
