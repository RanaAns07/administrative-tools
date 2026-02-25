import mongoose, { Schema, Document, Types } from 'mongoose';

export type LoanStatus = 'ACTIVE' | 'REPAID' | 'WRITTEN_OFF';

export interface ILoanAdvance extends Document {
    employee: Types.ObjectId;
    loanNumber: string;         // LOAN-2025-001
    loanType: 'LOAN' | 'ADVANCE';
    amount: number;
    disbursedDate: Date;
    monthlyInstallment: number;
    remainingBalance: number;
    totalRepaid: number;
    status: LoanStatus;
    journalEntry?: Types.ObjectId; // Disbursement JE
    assetAccountCode: string;    // CoA: Employee Loans Receivable
    notes?: string;
    approvedBy: string;
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
}

const LoanAdvanceSchema = new Schema<ILoanAdvance>(
    {
        employee: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
        loanNumber: { type: String, unique: true, trim: true },
        loanType: { type: String, enum: ['LOAN', 'ADVANCE'], required: true },
        amount: { type: Number, required: true, min: 0 },
        disbursedDate: { type: Date, required: true },
        monthlyInstallment: { type: Number, required: true, min: 0 },
        remainingBalance: { type: Number, required: true },
        totalRepaid: { type: Number, default: 0 },
        status: { type: String, enum: ['ACTIVE', 'REPAID', 'WRITTEN_OFF'], default: 'ACTIVE' },
        journalEntry: { type: Schema.Types.ObjectId, ref: 'JournalEntry' },
        assetAccountCode: { type: String, required: true },
        notes: { type: String },
        approvedBy: { type: String, required: true },
        createdBy: { type: String, required: true },
    },
    { timestamps: true }
);

LoanAdvanceSchema.index({ employee: 1 });
LoanAdvanceSchema.index({ status: 1 });

const LoanAdvance =
    mongoose.models.LoanAdvance ||
    mongoose.model<ILoanAdvance>('LoanAdvance', LoanAdvanceSchema);

export default LoanAdvance;
