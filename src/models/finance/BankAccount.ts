import mongoose, { Schema, Document } from 'mongoose';

export type BankAccountType = 'CURRENT' | 'SAVINGS' | 'PETTY_CASH' | 'FIXED_DEPOSIT';

export interface IBankAccount extends Document {
    accountNumber: string;
    accountTitle: string;
    bankName: string;
    branchName?: string;
    branchCode?: string;
    accountType: BankAccountType;
    currency: string;           // 'PKR'
    openingBalance: number;
    currentBalance: number;
    ledgerAccountCode: string;  // CoA mapping
    isActive: boolean;
    notes?: string;
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
}

const BankAccountSchema = new Schema<IBankAccount>(
    {
        accountNumber: { type: String, required: true, unique: true, trim: true },
        accountTitle: { type: String, required: true, trim: true },
        bankName: { type: String, required: true },
        branchName: { type: String },
        branchCode: { type: String },
        accountType: {
            type: String,
            enum: ['CURRENT', 'SAVINGS', 'PETTY_CASH', 'FIXED_DEPOSIT'],
            default: 'CURRENT',
        },
        currency: { type: String, default: 'PKR' },
        openingBalance: { type: Number, default: 0 },
        currentBalance: { type: Number, default: 0 },
        ledgerAccountCode: { type: String, required: true },
        isActive: { type: Boolean, default: true },
        notes: { type: String },
        createdBy: { type: String, required: true },
    },
    { timestamps: true }
);

BankAccountSchema.index({ accountNumber: 1 }, { unique: true });
BankAccountSchema.index({ isActive: 1 });

const BankAccount =
    mongoose.models.BankAccount ||
    mongoose.model<IBankAccount>('BankAccount', BankAccountSchema);

export default BankAccount;
