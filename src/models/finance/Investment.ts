/**
 * @file Investment.ts
 * @description Investment Tracking (Fixed Deposits, Short-term, Capital)
 *
 * Tracks university investments: fixed deposits, government securities, etc.
 *
 * MONEY FLOW (FinanceTransactionService):
 *   Placed:  INVESTMENT_OUTFLOW → wallet balance decreases
 *   Matured: INVESTMENT_RETURN  → wallet balance increases
 *
 * Status transitions:
 *   ACTIVE → MATURED (on return recording)
 *   ACTIVE → WITHDRAWN (early withdrawal)
 */

import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export type InvestmentType = 'FIXED_DEPOSIT' | 'SHORT_TERM' | 'CAPITAL';
export type InvestmentStatus = 'ACTIVE' | 'MATURED' | 'WITHDRAWN';

export interface IInvestment extends Document {
    investmentNumber: string;          // INV-2026-001
    name: string;                      // "HBL 6-Month FD"
    type: InvestmentType;
    principalAmount: number;
    interestRate?: number;             // Annual % (optional, informational)
    startDate: Date;
    maturityDate?: Date;
    expectedReturnAmount?: number;
    status: InvestmentStatus;
    sourceWalletId: Types.ObjectId;   // Where principal came from
    returnWalletId?: Types.ObjectId;  // Where return will go
    outflowTxId?: Types.ObjectId;     // Set after INVESTMENT_OUTFLOW recorded
    returnTxId?: Types.ObjectId;      // Set after INVESTMENT_RETURN recorded
    actualReturnAmount?: number;
    notes?: string;
    recordedBy: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const InvestmentSchema = new Schema<IInvestment>(
    {
        investmentNumber: {
            type: String,
            required: true,
            unique: true,
            trim: true,
        },
        name: {
            type: String,
            required: [true, 'Investment name is required.'],
            trim: true,
            maxlength: 200,
        },
        type: {
            type: String,
            enum: ['FIXED_DEPOSIT', 'SHORT_TERM', 'CAPITAL'],
            required: [true, 'Investment type is required.'],
        },
        principalAmount: {
            type: Number,
            required: [true, 'Principal amount is required.'],
            min: [1, 'Principal must be positive.'],
        },
        interestRate: { type: Number, min: 0 },
        startDate: {
            type: Date,
            required: [true, 'Start date is required.'],
        },
        maturityDate: { type: Date },
        expectedReturnAmount: { type: Number, min: 0 },
        status: {
            type: String,
            enum: ['ACTIVE', 'MATURED', 'WITHDRAWN'],
            default: 'ACTIVE',
        },
        sourceWalletId: {
            type: Schema.Types.ObjectId,
            ref: 'Wallet',
            required: [true, 'Source wallet is required.'],
        },
        returnWalletId: { type: Schema.Types.ObjectId, ref: 'Wallet' },
        outflowTxId: { type: Schema.Types.ObjectId, ref: 'Transaction' },
        returnTxId: { type: Schema.Types.ObjectId, ref: 'Transaction' },
        actualReturnAmount: { type: Number, min: 0 },
        notes: { type: String, trim: true, maxlength: 1000 },
        recordedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
    },
    {
        timestamps: true,
        collection: 'finance_investments',
    }
);

InvestmentSchema.index({ status: 1 });
InvestmentSchema.index({ maturityDate: 1 });
InvestmentSchema.index({ type: 1 });

const Investment: Model<IInvestment> =
    mongoose.models.Investment ||
    mongoose.model<IInvestment>('Investment', InvestmentSchema);

export default Investment;
