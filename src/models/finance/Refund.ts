/**
 * @file Refund.ts
 * @description Refund Record — Complete Refund History
 *
 * Every refund event (overpayment return, security deposit, admission cancel,
 * or manual adjustment) is captured here as an immutable record.
 *
 * MONEY FLOW (handled by FinanceTransactionService.recordRefund()):
 *   Creates REFUND outflow Transaction → decrements wallet balance
 *   Creates this Refund document for audit trail
 *
 * No refund record can be deleted. Only status tracking here.
 */

import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export type RefundType = 'OVERPAYMENT' | 'SECURITY_DEPOSIT' | 'ADMISSION_CANCEL' | 'ADJUSTMENT';

export interface IRefund extends Document {
    refundNumber: string;          // REF-1740697642000
    studentProfileId: Types.ObjectId;
    refundType: RefundType;
    amount: number;
    walletId: Types.ObjectId;      // Wallet from which refund was paid
    txId: Types.ObjectId;          // REFUND outflow transaction
    sourceInvoiceId?: Types.ObjectId;
    reason: string;
    processedBy: Types.ObjectId;
    processedAt: Date;
    createdAt: Date;
    updatedAt: Date;
}

const RefundSchema = new Schema<IRefund>(
    {
        refundNumber: {
            type: String,
            required: true,
            unique: true,
            trim: true,
        },
        studentProfileId: {
            type: Schema.Types.ObjectId,
            ref: 'StudentProfile',
            required: [true, 'Student profile reference is required.'],
        },
        refundType: {
            type: String,
            enum: ['OVERPAYMENT', 'SECURITY_DEPOSIT', 'ADMISSION_CANCEL', 'ADJUSTMENT'],
            required: [true, 'Refund type is required.'],
        },
        amount: {
            type: Number,
            required: [true, 'Refund amount is required.'],
            min: [0.01, 'Refund amount must be positive.'],
        },
        walletId: {
            type: Schema.Types.ObjectId,
            ref: 'Wallet',
            required: [true, 'Wallet reference is required.'],
        },
        txId: {
            type: Schema.Types.ObjectId,
            ref: 'Transaction',
            required: [true, 'Transaction reference (txId) is required.'],
        },
        sourceInvoiceId: {
            type: Schema.Types.ObjectId,
            ref: 'FeeInvoiceV2',
        },
        reason: {
            type: String,
            required: [true, 'Refund reason is required.'],
            trim: true,
            maxlength: [500, 'Reason must not exceed 500 characters.'],
        },
        processedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'processedBy (User) is required.'],
        },
        processedAt: {
            type: Date,
            default: Date.now,
        },
    },
    {
        timestamps: true,
        collection: 'finance_refunds',
    }
);

RefundSchema.index({ studentProfileId: 1 });
RefundSchema.index({ refundType: 1 });
RefundSchema.index({ processedAt: -1 });
RefundSchema.index({ txId: 1 });

const Refund: Model<IRefund> =
    mongoose.models.Refund ||
    mongoose.model<IRefund>('Refund', RefundSchema);

export default Refund;
