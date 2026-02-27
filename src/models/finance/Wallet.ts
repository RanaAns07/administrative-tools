/**
 * @file Wallet.ts
 * @description Khatta Engine — Wallet Model
 *
 * A Wallet represents any physical or digital place where money is held.
 * The balance here is the single source of truth; it is updated automatically
 * by the Transaction pre-save hook — do NOT update it manually from API routes.
 *
 * Examples:
 *   BANK       → 'Main Bank HBL', 'MCB Payroll Account'
 *   CASH       → 'Front Desk Petty Cash', 'Admission Office Cash'
 *   INVESTMENT → 'Reserve Fund', 'Fixed Deposit A'
 */

import mongoose, { Schema, Document, Model, Types } from 'mongoose';

// ─── TypeScript Interfaces ────────────────────────────────────────────────────

/** The kinds of storage a wallet can represent */
export type WalletType = 'BANK' | 'CASH' | 'INVESTMENT';

/** Shape of a Wallet document returned from MongoDB */
export interface IWallet extends Document {
    /** Friendly name shown throughout the UI */
    name: string;
    /** Physical/digital nature of this wallet */
    type: WalletType;
    /**
     * Running balance maintained by the Transaction pre-save hook.
     * Read this field; never write it directly from application code.
     */
    currentBalance: number;
    /** ISO 4217 currency code. Default: PKR */
    currency: string;
    /** Soft-delete flag — inactive wallets are hidden from new entries */
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    /** Virtual: balance as a human-readable string e.g. "PKR 12,500.00" */
    formattedBalance: string;
}

/** Static method typings on the Wallet model */
interface IWalletModel extends Model<IWallet> {
    /**
     * Safely retrieve only the current balance of a wallet by its ID.
     * Returns `null` if the wallet does not exist.
     *
     * @param walletId - The ObjectId of the wallet to query
     */
    getBalance(walletId: Types.ObjectId | string): Promise<number | null>;
}

// ─── Schema ───────────────────────────────────────────────────────────────────

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
                values: ['BANK', 'CASH', 'INVESTMENT'],
                message: 'Wallet type must be BANK, CASH, or INVESTMENT.',
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
    },
    {
        timestamps: true,
        collection: 'finance_wallets',
        // Expose virtuals when converting to JSON (for API responses)
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

// ─── Virtuals ─────────────────────────────────────────────────────────────────

/**
 * formattedBalance
 * Returns the balance as a locale-formatted string, e.g. "PKR 12,500.00".
 * Useful for display in UI components without extra formatting logic.
 */
WalletSchema.virtual('formattedBalance').get(function (this: IWallet) {
    return `${this.currency} ${this.currentBalance.toLocaleString('en-PK', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;
});

// ─── Static Methods ───────────────────────────────────────────────────────────

/**
 * getBalance — fetch only the currentBalance of a single wallet.
 * Safer than loading the full document when you only need the number.
 */
WalletSchema.statics.getBalance = async function (
    walletId: Types.ObjectId | string
): Promise<number | null> {
    const doc = await this.findById(walletId).select('currentBalance').lean();
    return doc ? (doc as { currentBalance: number }).currentBalance : null;
};

// ─── Indexes ──────────────────────────────────────────────────────────────────

WalletSchema.index({ type: 1 });
WalletSchema.index({ isActive: 1 });

// ─── Model Export ─────────────────────────────────────────────────────────────

const Wallet: IWalletModel =
    (mongoose.models.Wallet as IWalletModel) ||
    mongoose.model<IWallet, IWalletModel>('Wallet', WalletSchema);

export default Wallet;
