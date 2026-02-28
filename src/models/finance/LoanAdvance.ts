import mongoose, { Schema, Document, Types } from 'mongoose';

export type LoanStatus = 'ACTIVE' | 'REPAID' | 'WRITTEN_OFF';

export interface ILoanAdvance extends Document {
    staffId: Types.ObjectId;
    loanNumber: string;         // LOAN-2025-001
    loanType: 'LOAN' | 'ADVANCE';
    amount: number;
    disbursedDate: Date;
    monthlyInstallment: number;
    remainingBalance: number;
    totalRepaid: number;
    status: LoanStatus;
    transactionId?: Types.ObjectId; // Vault Disbursement Transaction
    walletId?: Types.ObjectId; // Which wallet gave the loan
    notes?: string;
    approvedBy?: string;
    createdBy?: string;
    createdAt: Date;
    updatedAt: Date;
}

const LoanAdvanceSchema = new Schema<ILoanAdvance>(
    {
        staffId: { type: Schema.Types.ObjectId, ref: 'UniversityStaff', required: true },
        loanNumber: { type: String, unique: true, trim: true },
        loanType: { type: String, enum: ['LOAN', 'ADVANCE'], required: true },
        amount: { type: Number, required: true, min: 0 },
        disbursedDate: { type: Date, required: true },
        monthlyInstallment: { type: Number, required: true, min: 0 },
        remainingBalance: { type: Number, required: true },
        totalRepaid: { type: Number, default: 0 },
        status: { type: String, enum: ['ACTIVE', 'REPAID', 'WRITTEN_OFF'], default: 'ACTIVE' },
        transactionId: { type: Schema.Types.ObjectId, ref: 'Transaction' },
        walletId: { type: Schema.Types.ObjectId, ref: 'Wallet' },
        notes: { type: String },
        approvedBy: { type: String },
        createdBy: { type: String },
    },
    { timestamps: true }
);

LoanAdvanceSchema.index({ staffId: 1 });
LoanAdvanceSchema.index({ status: 1 });

const LoanAdvance =
    mongoose.models.LoanAdvance ||
    mongoose.model<ILoanAdvance>('LoanAdvance', LoanAdvanceSchema);

export default LoanAdvance;
