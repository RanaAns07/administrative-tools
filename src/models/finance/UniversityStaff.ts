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
    name: string;
    role: string;
    department: string;
    employmentType: StaffEmploymentType;
    baseSalary: number;
    perCreditHourRate: number;
    isActive: boolean;
    cnic?: string;
    bankAccountNumber?: string;
    bankName?: string;
    bankAccountTitle?: string;
    joiningDate?: Date;
    ntn?: string;
    email?: string;
    phone?: string;
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
        department: {
            type: String,
            required: [true, 'Department is required.'],
            trim: true,
            maxlength: [150, 'Department must not exceed 150 characters.'],
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
        isActive: { type: Boolean, default: true },
        cnic: { type: String, trim: true, sparse: true },
        bankAccountNumber: { type: String, trim: true },
        bankName: { type: String, trim: true },
        bankAccountTitle: { type: String, trim: true },
        joiningDate: { type: Date },
        ntn: { type: String, trim: true },
        email: { type: String, trim: true, lowercase: true },
        phone: { type: String, trim: true },
    },
    {
        timestamps: true,
        collection: 'university_staff',
    }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────

UniversityStaffSchema.index({ isActive: 1 });
UniversityStaffSchema.index({ employmentType: 1 });
UniversityStaffSchema.index({ name: 1 });

// ─── Model Export ─────────────────────────────────────────────────────────────

const UniversityStaff: Model<IUniversityStaff> =
    mongoose.models.UniversityStaff ||
    mongoose.model<IUniversityStaff>('UniversityStaff', UniversityStaffSchema);

export default UniversityStaff;
