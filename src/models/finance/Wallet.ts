/**
 * @file Wallet.ts
 * @description Khatta Engine — Wallet (Pure Schema, No Side Effects)
 *
 * ARCHITECTURE: This model has NO pre/post hooks that affect balances.
 * Balance is ONLY updated by FinanceTransactionService via atomic $inc
 * inside MongoDB client sessions.
 *
 * Wallet types:
 *   BANK       — each bank account is a separate wallet
 *   CASH       — physical cash in hand (front desk, etc.)
 *   PETTY_CASH — small discretionary cash fund
 *   INVESTMENT — placeholder balance for investment positions
 *
 * currentBalance is the single source of truth but is READ-ONLY
 * from application code. Only the service layer may write to it.
 */

import mongoose, { Schema, Document, Model } from 'mongoose';

export type WalletType = 'BANK' | 'CASH' | 'PETTY_CASH' | 'INVESTMENT';

export interface IWallet extends Document {
    name: string;
    type: WalletType;
    /** Maintained exclusively by FinanceTransactionService. NEVER write directly. */
    currentBalance: number;
    currency: string;
    isActive: boolean;
    description?: string;
    createdAt: Date;
    updatedAt: Date;
}

const WalletSchema = new Schema<IWallet>(
    {
        name: {
            type: String,
            required: [true, 'Wallet name is required.'],
            unique: true,
            trim: true,
            maxlength: [150, 'Wallet name must not exceed 150 characters.'],
        },
        type: {
            type: String,
            required: [true, 'Wallet type is required.'],
            enum: {
                values: ['BANK', 'CASH', 'PETTY_CASH', 'INVESTMENT'],
                message: 'Wallet type must be BANK, CASH, PETTY_CASH, or INVESTMENT.',
            },
        },
        currentBalance: {
            type: Number,
            default: 0,
        },
        currency: {
            type: String,
            default: 'PKR',
            uppercase: true,
            trim: true,
            minlength: [3, 'Currency must be a 3-letter ISO code.'],
            maxlength: [3, 'Currency must be a 3-letter ISO code.'],
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        description: {
            type: String,
            trim: true,
            maxlength: 300,
        },
    },
    {
        timestamps: true,
        collection: 'finance_wallets',
        optimisticConcurrency: true,
    }
);

WalletSchema.index({ type: 1 });
WalletSchema.index({ isActive: 1 });

const Wallet: Model<IWallet> =
    (mongoose.models.Wallet as Model<IWallet>) ||
    mongoose.model<IWallet>('Wallet', WalletSchema);

export default Wallet;
