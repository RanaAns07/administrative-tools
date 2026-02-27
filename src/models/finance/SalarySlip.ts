/**
 * @file SalarySlip.ts
 * @description Khatta HR Engine — Individual Salary Slip
 *
 * A SalarySlip represents one month's pay for one staff member.
 * It is the granular unit the payroll disburse API operates on.
 *
 * DISBURSEMENT FLOW:
 *   POST /api/finance/payroll/disburse
 *     → updates SalarySlip.status to 'PAID'
 *     → creates one Transaction (type: OUT) per slip
 *     → Transaction.pre('save) decrements Wallet.currentBalance
 *
 * The `netPayable` field is auto-computed by the pre-save hook.
 * Never set it manually — update baseAmount, allowances, or deductions instead.
 *
 * STATUS FLOW:
 *   DRAFT → PAID   (via the /payroll/disburse API)
 *   DRAFT → VOID   (admin cancels before payment)
 */

import mongoose, { Schema, Document, Model, Types } from 'mongoose';

// ─── TypeScript Interface ─────────────────────────────────────────────────────

export type SalarySlipStatus = 'DRAFT' | 'PAID' | 'VOID';

export interface ISalarySlip extends Document {
    /** The staff member this slip belongs to */
    staffId: Types.ObjectId;
    /** Payroll month (1 = January … 12 = December) */
    month: number;
    /** Payroll year e.g. 2026 */
    year: number;
    /** Base salary for the month (copied from UniversityStaff.baseSalary at slip-generation time) */
    baseAmount: number;
    /** Any additions: housing, transport, medical allowances */
    allowances: number;
    /** Any deductions: income tax, provident fund, loan instalments */
    deductions: number;
    /**
     * Net amount payable.
     * Auto-computed by the pre-save hook: baseAmount + allowances - deductions.
     * Read-only from API routes.
     */
    netPayable: number;
    /** Lifecycle status */
    status: SalarySlipStatus;
    /**
     * Date the salary was actually disbursed.
     * Set by the payroll disburse API when status transitions to PAID.
     */
    paidDate?: Date;
    /** Reference to the Transaction created during disbursement */
    transactionId?: Types.ObjectId;
    /** Optional admin note */
    notes?: string;
    createdAt: Date;
    updatedAt: Date;
}

// ─── Schema ───────────────────────────────────────────────────────────────────

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
            min: [1, 'Month must be between 1 and 12.'],
            max: [12, 'Month must be between 1 and 12.'],
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
        paidDate: {
            type: Date,
        },
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

// ─── Pre-Save Hook ────────────────────────────────────────────────────────────

/**
 * Auto-compute netPayable so it's always in sync.
 * Clamps to 0 to prevent negative payables.
 */
SalarySlipSchema.pre('save', function () {
    this.netPayable = Math.max(0, this.baseAmount + this.allowances - this.deductions);
});

// ─── Indexes ──────────────────────────────────────────────────────────────────

// Core query: get all slips for a specific month/year batch disbursement
SalarySlipSchema.index({ month: 1, year: 1 });
// Per-staff payroll history
SalarySlipSchema.index({ staffId: 1 });
// Disbursement queue: find all DRAFT slips
SalarySlipSchema.index({ status: 1 });
// Compound: slips for a staff member in a specific period
SalarySlipSchema.index({ staffId: 1, month: 1, year: 1 }, { unique: true });

// ─── Model Export ─────────────────────────────────────────────────────────────

const SalarySlip: Model<ISalarySlip> =
    mongoose.models.SalarySlip ||
    mongoose.model<ISalarySlip>('SalarySlip', SalarySlipSchema);

export default SalarySlip;
