/**
 * @file UniversityStaff.ts
 * @description Khatta HR Engine — University Staff Member
 *
 * A lean, Khatta-aligned replacement for the COA-based Employee model.
 * UniversityStaff drives SalarySlip generation and payroll disbursement
 * directly through the Transaction engine — no journal entries, no account
 * codes, no accounting periods.
 *
 * Employment types:
 *   PERMANENT   — salaried staff paid monthly (baseSalary)
 *   CONTRACT    — fixed-term contract staff paid monthly (baseSalary)
 *   VISITING    — faculty paid per credit hour taught (perCreditHourRate)
 *
 * The model is intentionally minimal. Advanced HR fields (leaves, CNIC, bank
 * account, NTN) belong in a dedicated HR module. This model only carries what
 * the finance/payroll workflow needs.
 */

import mongoose, { Schema, Document, Model } from 'mongoose';

// ─── TypeScript Interface ─────────────────────────────────────────────────────

export type StaffEmploymentType = 'PERMANENT' | 'VISITING' | 'CONTRACT';

export interface IUniversityStaff extends Document {
    /** Full name on payslip */
    name: string;
    /** Job title / role e.g. 'Lecturer', 'Lab Technician', 'Security Guard' */
    role: string;
    /** How the staff member is employed — determines salary calculation method */
    employmentType: StaffEmploymentType;
    /**
     * Monthly fixed salary for PERMANENT and CONTRACT staff.
     * Defaults to 0 for VISITING faculty (they are paid per credit hour).
     */
    baseSalary: number;
    /**
     * PKR rate per credit hour taught, used for VISITING faculty.
     * Ignored for PERMANENT/CONTRACT.
     */
    perCreditHourRate: number;
    /** Soft-delete — inactive staff cannot receive new salary slips */
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

// ─── Schema ───────────────────────────────────────────────────────────────────

const UniversityStaffSchema = new Schema<IUniversityStaff>(
    {
        name: {
            type: String,
            required: [true, 'Staff name is required.'],
            trim: true,
            maxlength: [200, 'Name must not exceed 200 characters.'],
        },
        role: {
            type: String,
            required: [true, 'Role/designation is required.'],
            trim: true,
            maxlength: [150, 'Role must not exceed 150 characters.'],
        },
        employmentType: {
            type: String,
            required: [true, 'Employment type is required.'],
            enum: {
                values: ['PERMANENT', 'VISITING', 'CONTRACT'],
                message: 'employmentType must be PERMANENT, VISITING, or CONTRACT.',
            },
        },
        baseSalary: {
            type: Number,
            default: 0,
            min: [0, 'Base salary cannot be negative.'],
        },
        perCreditHourRate: {
            type: Number,
            default: 0,
            min: [0, 'Per-credit-hour rate cannot be negative.'],
        },
        isActive: {
            type: Boolean,
            default: true,
        },
    },
    {
        timestamps: true,
        collection: 'university_staff',
    }
);

// ─── Pre-Save Validation ──────────────────────────────────────────────────────

/**
 * Business rule:
 *   VISITING faculty must have a perCreditHourRate > 0.
 *   PERMANENT/CONTRACT staff must have a baseSalary > 0.
 */
UniversityStaffSchema.pre('validate', function () {
    if (this.employmentType === 'VISITING' && this.perCreditHourRate === 0) {
        throw new Error('VISITING faculty must have a perCreditHourRate greater than 0.');
    }
    if (
        (this.employmentType === 'PERMANENT' || this.employmentType === 'CONTRACT') &&
        this.baseSalary === 0
    ) {
        throw new Error(`${this.employmentType} staff must have a baseSalary greater than 0.`);
    }
});

// ─── Indexes ──────────────────────────────────────────────────────────────────

UniversityStaffSchema.index({ isActive: 1 });
UniversityStaffSchema.index({ employmentType: 1 });
UniversityStaffSchema.index({ name: 1 });

// ─── Model Export ─────────────────────────────────────────────────────────────

const UniversityStaff: Model<IUniversityStaff> =
    mongoose.models.UniversityStaff ||
    mongoose.model<IUniversityStaff>('UniversityStaff', UniversityStaffSchema);

export default UniversityStaff;
