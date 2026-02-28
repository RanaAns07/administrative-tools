/**
 * @file SalarySlip.ts
 * @description Khatta HR Engine — Individual Salary Slip (Pure Schema)
 *
 * ARCHITECTURE: No pre('save') hook. netPayable is computed in
 * FinanceTransactionService.recordSalaryDisbursement() and stored here.
 *
 * STATUS FLOW:
 *   DRAFT → PAID   (via FinanceTransactionService.recordSalaryDisbursement)
 *   DRAFT → VOID   (admin cancels before payment)
 */

import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export type SalarySlipStatus = 'DRAFT' | 'PAID' | 'VOID';

export interface ISalarySlip extends Document {
    staffId: Types.ObjectId;
    month: number;
    year: number;
    baseAmount: number;
    allowances: number;
    deductions: number;
    /** Computed in FinanceTransactionService, stored here for records. */
    netPayable: number;
    status: SalarySlipStatus;
    paidDate?: Date;
    transactionId?: Types.ObjectId;
    notes?: string;
    createdAt: Date;
    updatedAt: Date;
}

const SalarySlipSchema = new Schema<ISalarySlip>(
    {
        staffId: {
            type: Schema.Types.ObjectId,
            ref: 'UniversityStaff',
            required: [true, 'Staff reference (staffId) is required.'],
        },
        month: {
            type: Number,
            required: [true, 'Month is required.'],
            min: [1, 'Month must be 1–12.'],
            max: [12, 'Month must be 1–12.'],
        },
        year: {
            type: Number,
            required: [true, 'Year is required.'],
            min: [2000, 'Year must be 2000 or later.'],
        },
        baseAmount: {
            type: Number,
            required: [true, 'Base salary amount is required.'],
            min: [0, 'Base amount cannot be negative.'],
        },
        allowances: {
            type: Number,
            default: 0,
            min: [0, 'Allowances cannot be negative.'],
        },
        deductions: {
            type: Number,
            default: 0,
            min: [0, 'Deductions cannot be negative.'],
        },
        netPayable: {
            type: Number,
            default: 0,
            min: [0, 'Net payable cannot be negative.'],
        },
        status: {
            type: String,
            required: true,
            enum: {
                values: ['DRAFT', 'PAID', 'VOID'],
                message: 'Status must be DRAFT, PAID, or VOID.',
            },
            default: 'DRAFT',
        },
        paidDate: { type: Date },
        transactionId: {
            type: Schema.Types.ObjectId,
            ref: 'Transaction',
        },
        notes: {
            type: String,
            trim: true,
            maxlength: [1000, 'Notes must not exceed 1000 characters.'],
        },
    },
    {
        timestamps: true,
        collection: 'finance_salary_slips',
    }
);

SalarySlipSchema.index({ month: 1, year: 1 });
SalarySlipSchema.index({ staffId: 1 });
SalarySlipSchema.index({ status: 1 });
SalarySlipSchema.index({ staffId: 1, month: 1, year: 1 }, { unique: true });

const SalarySlip: Model<ISalarySlip> =
    mongoose.models.SalarySlip ||
    mongoose.model<ISalarySlip>('SalarySlip', SalarySlipSchema);

export default SalarySlip;
