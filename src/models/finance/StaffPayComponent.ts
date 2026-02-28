/**
 * @file StaffPayComponent.ts
 * @description Itemized Salary Allowances & Deductions Per Staff Member
 *
 * Each active component is picked up by the payroll generation service
 * when building a SalarySlip for a staff member.
 *
 * Examples:
 *   ALLOWANCE | FIXED      | 5000  → "Transport Allowance"
 *   ALLOWANCE | PERCENTAGE | 45    → "House Rent Allowance (45% of basic)"
 *   DEDUCTION | PERCENTAGE | 8     → "Income Tax (8%)"
 *   DEDUCTION | FIXED      | 3000  → "Provident Fund"
 *
 * Computation is done IN SERVICE, not in a model hook.
 */

import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export type PayComponentType = 'ALLOWANCE' | 'DEDUCTION';
export type PayCalculationType = 'FIXED' | 'PERCENTAGE';

export interface IStaffPayComponent extends Document {
    staffId: Types.ObjectId;
    componentType: PayComponentType;
    name: string;
    calculationType: PayCalculationType;
    value: number;       // If FIXED: PKR. If PERCENTAGE: % of baseSalary.
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const StaffPayComponentSchema = new Schema<IStaffPayComponent>(
    {
        staffId: {
            type: Schema.Types.ObjectId,
            ref: 'UniversityStaff',
            required: [true, 'Staff reference (staffId) is required.'],
        },
        componentType: {
            type: String,
            enum: ['ALLOWANCE', 'DEDUCTION'],
            required: [true, 'Component type (ALLOWANCE or DEDUCTION) is required.'],
        },
        name: {
            type: String,
            required: [true, 'Component name is required.'],
            trim: true,
            maxlength: [150, 'Name must not exceed 150 characters.'],
        },
        calculationType: {
            type: String,
            enum: ['FIXED', 'PERCENTAGE'],
            default: 'FIXED',
        },
        value: {
            type: Number,
            required: [true, 'Value is required.'],
            min: [0, 'Value cannot be negative.'],
        },
        isActive: {
            type: Boolean,
            default: true,
        },
    },
    {
        timestamps: true,
        collection: 'finance_staff_pay_components',
    }
);

StaffPayComponentSchema.index({ staffId: 1 });
StaffPayComponentSchema.index({ staffId: 1, isActive: 1 });

const StaffPayComponent: Model<IStaffPayComponent> =
    mongoose.models.StaffPayComponent ||
    mongoose.model<IStaffPayComponent>('StaffPayComponent', StaffPayComponentSchema);

export default StaffPayComponent;
