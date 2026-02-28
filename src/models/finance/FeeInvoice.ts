/**
 * @file FeeInvoice.ts
 * @description Khatta Fee Engine — Fee Invoice (Pure Schema, No Hooks)
 *
 * ARCHITECTURE: No pre('save') hooks. Status is derived and set explicitly
 * by the FinanceTransactionService after each payment operation.
 *
 * Key additions over previous version:
 *   - `batchId`           for fast batch-level reporting
 *   - `scholarshipId`     reference to applied scholarship
 *   - `discountFromAdvance` tracks advance balance applied
 *   - Status derivation moved to service layer (not hook)
 *
 * STATUS TRANSITIONS (managed by service, not hooks):
 *   PENDING → PARTIAL → PAID
 *   PENDING → OVERDUE
 *   Any     → WAIVED (admin writes off outstanding amount)
 */

import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export type FeeInvoiceStatus = 'PENDING' | 'PARTIAL' | 'PAID' | 'OVERDUE' | 'WAIVED';

export interface IFeeInvoice extends Document {
    studentProfileId: Types.ObjectId;
    batchId: Types.ObjectId;          // Denormalized for batch-level reports
    feeStructureId: Types.ObjectId;
    semesterNumber: number;
    issueDate: Date;
    dueDate: Date;
    totalAmount: number;
    discountAmount: number;           // From scholarship/manual discount
    discountFromAdvance: number;      // From StudentAdvanceBalance auto-application
    penaltyAmount: number;
    amountPaid: number;
    status: FeeInvoiceStatus;
    scholarshipId?: Types.ObjectId;
    installmentNumber?: number;
    notes?: string;
    createdAt: Date;
    updatedAt: Date;
}

const FeeInvoiceSchema = new Schema<IFeeInvoice>(
    {
        studentProfileId: {
            type: Schema.Types.ObjectId,
            ref: 'StudentProfile',
            required: [true, 'Student profile reference is required.'],
        },
        batchId: {
            type: Schema.Types.ObjectId,
            ref: 'Batch',
            required: [true, 'Batch reference is required.'],
        },
        feeStructureId: {
            type: Schema.Types.ObjectId,
            ref: 'FeeStructureV2',
            required: [true, 'Fee structure reference is required.'],
        },
        semesterNumber: {
            type: Number,
            required: [true, 'Semester number is required.'],
            min: [1, 'Semester number must be at least 1.'],
        },
        issueDate: {
            type: Date,
            default: Date.now,
        },
        dueDate: {
            type: Date,
            required: [true, 'Due date is required.'],
        },
        totalAmount: {
            type: Number,
            required: [true, 'Total amount is required.'],
            min: [0, 'Total amount cannot be negative.'],
        },
        discountAmount: {
            type: Number,
            default: 0,
            min: [0, 'Discount cannot be negative.'],
        },
        discountFromAdvance: {
            type: Number,
            default: 0,
            min: [0, 'Advance discount cannot be negative.'],
        },
        penaltyAmount: {
            type: Number,
            default: 0,
            min: [0, 'Penalty cannot be negative.'],
        },
        amountPaid: {
            type: Number,
            default: 0,
            min: [0, 'Amount paid cannot be negative.'],
        },
        status: {
            type: String,
            required: true,
            enum: {
                values: ['PENDING', 'PARTIAL', 'PAID', 'OVERDUE', 'WAIVED'],
                message: 'Status must be PENDING, PARTIAL, PAID, OVERDUE, or WAIVED.',
            },
            default: 'PENDING',
        },
        scholarshipId: {
            type: Schema.Types.ObjectId,
            ref: 'Scholarship',
            default: null,
        },
        installmentNumber: {
            type: Number,
            min: 1,
        },
        notes: {
            type: String,
            trim: true,
            maxlength: [1000, 'Notes must not exceed 1000 characters.'],
        },
    },
    {
        timestamps: true,
        collection: 'finance_fee_invoices',
    }
);

// Computed property available as a plain getter (no virtual needed for reports)
FeeInvoiceSchema.methods.getArrears = function (this: IFeeInvoice): number {
    const payable = this.totalAmount - this.discountAmount - this.discountFromAdvance + this.penaltyAmount;
    return Math.max(0, payable - this.amountPaid);
};

FeeInvoiceSchema.index({ studentProfileId: 1 });
FeeInvoiceSchema.index({ batchId: 1 });
FeeInvoiceSchema.index({ status: 1 });
FeeInvoiceSchema.index({ dueDate: 1, status: 1 });
FeeInvoiceSchema.index({ feeStructureId: 1 });
FeeInvoiceSchema.index({ semesterNumber: 1 });

const FeeInvoice: Model<IFeeInvoice> =
    (mongoose.models.FeeInvoiceV2 as Model<IFeeInvoice>) ||
    mongoose.model<IFeeInvoice>('FeeInvoiceV2', FeeInvoiceSchema);

export default FeeInvoice;
