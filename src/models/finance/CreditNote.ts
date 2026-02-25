import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ICreditNote extends Document {
    creditNoteNumber: string;   // CN-2025-00001
    feeInvoice: Types.ObjectId;
    feePayment?: Types.ObjectId;
    studentId: string;
    amount: number;
    reason: string;
    journalEntry?: Types.ObjectId;  // Reversal JE
    issuedBy: string;
    issuedAt: Date;
    isApplied: boolean;          // Has it reduced outstanding balance?
    appliedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

const CreditNoteSchema = new Schema<ICreditNote>(
    {
        creditNoteNumber: { type: String, unique: true, trim: true },
        feeInvoice: { type: Schema.Types.ObjectId, ref: 'FeeInvoice', required: true },
        feePayment: { type: Schema.Types.ObjectId, ref: 'FeePayment' },
        studentId: { type: String, required: true },
        amount: { type: Number, required: true, min: 0.01 },
        reason: { type: String, required: true },
        journalEntry: { type: Schema.Types.ObjectId, ref: 'JournalEntry' },
        issuedBy: { type: String, required: true },
        issuedAt: { type: Date, required: true, default: Date.now },
        isApplied: { type: Boolean, default: false },
        appliedAt: { type: Date },
    },
    { timestamps: true }
);

CreditNoteSchema.index({ feeInvoice: 1 });
CreditNoteSchema.index({ studentId: 1 });

const CreditNote =
    mongoose.models.CreditNote ||
    mongoose.model<ICreditNote>('CreditNote', CreditNoteSchema);

export default CreditNote;
