/**
 * @file Transaction.ts
 * @description Khatta Engine — Transaction Model
 *
 * This is the single source of truth for ALL money movement in the system.
 * Every rupee that enters, leaves, or moves between wallets has a record here.
 *
 * The pre-save hook is the engine room: it automatically adjusts
 * `Wallet.currentBalance` on every save. This means API routes never
 * need to touch wallet balances directly — they just create/update Transactions.
 *
 * Transaction Types:
 *   IN       → Money received into a wallet (e.g. student fee payment)
 *   OUT      → Money paid out of a wallet (e.g. salary disbursement)
 *   TRANSFER → Money moved between two internal wallets (e.g. bank → petty cash)
 */

import mongoose, { Schema, Document, Model, Types } from 'mongoose';
import Wallet from './Wallet';

// ─── TypeScript Interfaces ────────────────────────────────────────────────────

/** Direction of money movement */
export type TransactionType = 'IN' | 'OUT' | 'TRANSFER';

/**
 * Links this transaction back to the source record in another module.
 * Keeps finance self-contained without circular model dependencies.
 */
export type ReferenceType =
    | 'FEE_INVOICE'     // Tied to a student FeeInvoice document
    | 'PAYROLL_SLIP'    // Tied to a SalarySlip disbursement
    | 'VENDOR_BILL'     // Tied to a VendorInvoice
    | 'EXPENSE_RECORD'  // Tied to an ExpenseRecord
    | 'MANUAL';         // Ad-hoc entry by a front-desk clerk

/** Shape of a Transaction document returned from MongoDB */
export interface ITransaction extends Document {
    /**
     * Amount in the wallet's base currency (e.g. PKR).
     * Must be a positive number greater than zero.
     */
    amount: number;

    /** Direction of the money movement */
    type: TransactionType;

    /** Effective date of the transaction (defaults to time of creation) */
    date: Date;

    /**
     * The wallet money is coming FROM (for IN/OUT) or
     * the source wallet (for TRANSFER).
     */
    walletId: Types.ObjectId;

    /**
     * Destination wallet for TRANSFER transactions.
     * Required when type === 'TRANSFER'; must be different from walletId.
     */
    toWalletId?: Types.ObjectId;

    /**
     * Category tag (e.g. 'Tuition Fee', 'Utility Bill').
     * Required for IN and OUT. Not applicable for TRANSFER.
     */
    categoryId?: Types.ObjectId;

    /** Which module/document type this transaction originates from */
    referenceType?: ReferenceType;

    /**
     * The ID of the specific source document (e.g. the FeeInvoice _id).
     * Stored as a string so it works for both ObjectIds and external references.
     */
    referenceId?: string;

    /** Free-text remark left by the clerk at the time of entry */
    notes?: string;

    /** The user (clerk/admin) who recorded this transaction */
    performedBy: Types.ObjectId;

    createdAt: Date;
    updatedAt: Date;
}

// ─── Schema ───────────────────────────────────────────────────────────────────

const TransactionSchema = new Schema<ITransaction>(
    {
        amount: {
            type: Number,
            required: [true, 'Transaction amount is required.'],
            min: [0.01, 'Amount must be greater than zero.'],
        },
        type: {
            type: String,
            required: [true, 'Transaction type (IN, OUT, or TRANSFER) is required.'],
            enum: {
                values: ['IN', 'OUT', 'TRANSFER'],
                message: 'Transaction type must be IN, OUT, or TRANSFER.',
            },
        },
        date: {
            type: Date,
            default: Date.now,
        },
        walletId: {
            type: Schema.Types.ObjectId,
            ref: 'Wallet',
            required: [true, 'A source wallet (walletId) is required.'],
        },
        toWalletId: {
            type: Schema.Types.ObjectId,
            ref: 'Wallet',
            default: null,
        },
        categoryId: {
            type: Schema.Types.ObjectId,
            ref: 'Category',
            default: null,
        },
        referenceType: {
            type: String,
            enum: {
                values: ['FEE_INVOICE', 'PAYROLL_SLIP', 'VENDOR_BILL', 'MANUAL'],
                message: 'Invalid referenceType value.',
            },
            default: 'MANUAL',
        },
        referenceId: {
            type: String,
            trim: true,
            default: null,
        },
        notes: {
            type: String,
            trim: true,
            maxlength: [1000, 'Notes must not exceed 1000 characters.'],
        },
        performedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'performedBy (the recording user) is required.'],
        },
    },
    {
        timestamps: true,
        collection: 'finance_transactions',
    }
);

// ─── Validation ───────────────────────────────────────────────────────────────

/**
 * Cross-field validation:
 *   - TRANSFER must have a toWalletId that differs from walletId.
 *   - IN / OUT must have a categoryId.
 */
TransactionSchema.pre('validate', function () {
    if (this.type === 'TRANSFER') {
        if (!this.toWalletId) {
            throw new Error('TRANSFER transactions require a destination wallet (toWalletId).');
        }
        if (this.walletId.toString() === this.toWalletId.toString()) {
            throw new Error('Source and destination wallets must be different for a TRANSFER.');
        }
    }

    if ((this.type === 'IN' || this.type === 'OUT') && !this.categoryId) {
        throw new Error('A categoryId is required for IN and OUT transactions.');
    }
});

// ─── Pre-Save Hook: Wallet Balance Engine ────────────────────────────────────

/**
 * Automatically updates Wallet.currentBalance whenever a Transaction is saved.
 *
 * NEW transaction:
 *   IN       → source wallet balance += amount
 *   OUT      → source wallet balance -= amount
 *   TRANSFER → source wallet balance -= amount; dest wallet balance += amount
 *
 * UPDATED transaction (amount or type changed):
 *   First REVERSES the effect of the previous values, then APPLIES the new ones.
 *   This keeps balances accurate even when clerks correct mistakes.
 *
 * Note: We use `findByIdAndUpdate` with `$inc` for atomicity — this avoids
 * race conditions if two transactions are saved at the same time.
 */
TransactionSchema.pre('save', async function () {
    try {
        if (this.isNew) {
            // ── Brand-new transaction ──────────────────────────────────────────────

            if (this.type === 'IN') {
                await Wallet.findByIdAndUpdate(this.walletId, {
                    $inc: { currentBalance: this.amount },
                });
            } else if (this.type === 'OUT') {
                await Wallet.findByIdAndUpdate(this.walletId, {
                    $inc: { currentBalance: -this.amount },
                });
            } else if (this.type === 'TRANSFER' && this.toWalletId) {
                // Subtract from source, add to destination
                await Wallet.findByIdAndUpdate(this.walletId, {
                    $inc: { currentBalance: -this.amount },
                });
                await Wallet.findByIdAndUpdate(this.toWalletId, {
                    $inc: { currentBalance: this.amount },
                });
            }
        } else {
            // ── Existing transaction being edited ─────────────────────────────────
            // Fetch the original values before this save was called
            const original = await (this.constructor as Model<ITransaction>)
                .findById(this._id)
                .lean();

            if (original) {
                const prev = original as ITransaction;

                // Step 1: Reverse the old transaction's effect on wallet(s)
                if (prev.type === 'IN') {
                    await Wallet.findByIdAndUpdate(prev.walletId, {
                        $inc: { currentBalance: -prev.amount },
                    });
                } else if (prev.type === 'OUT') {
                    await Wallet.findByIdAndUpdate(prev.walletId, {
                        $inc: { currentBalance: prev.amount },
                    });
                } else if (prev.type === 'TRANSFER' && prev.toWalletId) {
                    await Wallet.findByIdAndUpdate(prev.walletId, {
                        $inc: { currentBalance: prev.amount },
                    });
                    await Wallet.findByIdAndUpdate(prev.toWalletId, {
                        $inc: { currentBalance: -prev.amount },
                    });
                }

                // Step 2: Apply the new transaction's effect on wallet(s)
                if (this.type === 'IN') {
                    await Wallet.findByIdAndUpdate(this.walletId, {
                        $inc: { currentBalance: this.amount },
                    });
                } else if (this.type === 'OUT') {
                    await Wallet.findByIdAndUpdate(this.walletId, {
                        $inc: { currentBalance: -this.amount },
                    });
                } else if (this.type === 'TRANSFER' && this.toWalletId) {
                    await Wallet.findByIdAndUpdate(this.walletId, {
                        $inc: { currentBalance: -this.amount },
                    });
                    await Wallet.findByIdAndUpdate(this.toWalletId, {
                        $inc: { currentBalance: this.amount },
                    });
                }
            }
        }

    } catch (err) {
        throw err;
    }
});

// ─── Indexes ──────────────────────────────────────────────────────────────────

// Most common query: all transactions for a given wallet, newest first
TransactionSchema.index({ walletId: 1, date: -1 });
// Filter by type (e.g. show only OUTs for expense reports)
TransactionSchema.index({ type: 1 });
// Look up by source document (e.g. all transactions for a FeeInvoice)
TransactionSchema.index({ referenceType: 1, referenceId: 1 });
// Audit trail: which transactions did a specific clerk make?
TransactionSchema.index({ performedBy: 1 });
// Date-range queries for period reports
TransactionSchema.index({ date: -1 });

// ─── Model Export ─────────────────────────────────────────────────────────────

const Transaction: Model<ITransaction> =
    mongoose.models.Transaction ||
    mongoose.model<ITransaction>('Transaction', TransactionSchema);

export default Transaction;
