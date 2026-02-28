/**
 * @file SecurityDeposit.ts
 * @description Student Security Deposit Tracking
 *
 * Records a one-time refundable deposit paid by a student at admission.
 * This is a LIABILITY on the university's books (held amount).
 *
 * MONEY FLOW (handled by FinanceTransactionService):
 *   Received: SECURITY_DEPOSIT inflow → wallet balance increases
 *   Refunded: REFUND outflow          → wallet balance decreases
 *             deposit.status → REFUNDED, refundTxId set
 *
 * Never delete a security deposit record — only mark as REFUNDED or FORFEITED.
 */

import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export type DepositStatus = 'HELD' | 'REFUNDED' | 'FORFEITED';

export interface ISecurityDeposit extends Document {
    studentProfileId: Types.ObjectId;
    amount: number;
    status: DepositStatus;
    paidDate: Date;
    /** The SECURITY_DEPOSIT inflow transaction */
    txId: Types.ObjectId;
    /** The REFUND outflow transaction (set when refunded) */
    refundTxId?: Types.ObjectId;
    refundDate?: Date;
    forfeitReason?: string;
    notes?: string;
    createdAt: Date;
    updatedAt: Date;
}

const SecurityDepositSchema = new Schema<ISecurityDeposit>(
    {
        studentProfileId: {
            type: Schema.Types.ObjectId,
            ref: 'StudentProfile',
            required: [true, 'Student profile reference is required.'],
        },
        amount: {
            type: Number,
            required: [true, 'Deposit amount is required.'],
            min: [1, 'Deposit amount must be positive.'],
        },
        status: {
            type: String,
            enum: ['HELD', 'REFUNDED', 'FORFEITED'],
            default: 'HELD',
        },
        paidDate: {
            type: Date,
            default: Date.now,
        },
        txId: {
            type: Schema.Types.ObjectId,
            ref: 'Transaction',
            required: [true, 'Transaction reference (txId) is required.'],
        },
        refundTxId: {
            type: Schema.Types.ObjectId,
            ref: 'Transaction',
        },
        refundDate: { type: Date },
        forfeitReason: { type: String, trim: true, maxlength: 500 },
        notes: { type: String, trim: true, maxlength: 1000 },
    },
    {
        timestamps: true,
        collection: 'finance_security_deposits',
    }
);

SecurityDepositSchema.index({ studentProfileId: 1 });
SecurityDepositSchema.index({ status: 1 });

const SecurityDeposit: Model<ISecurityDeposit> =
    mongoose.models.SecurityDeposit ||
    mongoose.model<ISecurityDeposit>('SecurityDeposit', SecurityDepositSchema);

export default SecurityDeposit;
