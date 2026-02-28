/**
 * @file Scholarship.ts
 * @description Student Scholarship / Discount Record
 *
 * Redesigned for Khatta architecture: scholarships are student-level records
 * valid across a range of semesters. The discount is applied to invoices
 * by the service layer — not by hooks.
 *
 * TYPES:
 *   PERCENTAGE — e.g. 50% off total invoice amount
 *   FIXED      — e.g. PKR 25,000 fixed discount per semester
 *
 * CATEGORIES: merit, need-based, sports, government, staff-dependent, etc.
 */

import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export type ScholarshipDiscountType = 'PERCENTAGE' | 'FIXED';

export type ScholarshipCategory =
    | 'MERIT'
    | 'NEED_BASED'
    | 'SPORTS'
    | 'STAFF_DEPENDENT'
    | 'HAFIZ_E_QURAN'
    | 'SIBLING'
    | 'GOVERNMENT'
    | 'OTHER';

export interface IScholarship extends Document {
    studentProfileId: Types.ObjectId;
    name: string;                      // "Merit Scholarship"
    category: ScholarshipCategory;
    discountType: ScholarshipDiscountType;
    discountValue: number;             // PERCENTAGE: 0–100 | FIXED: PKR amount
    validFromSemester: number;
    validToSemester: number;
    isActive: boolean;
    approvedBy: Types.ObjectId;        // User who granted this scholarship
    approvedAt: Date;
    notes?: string;
    createdAt: Date;
    updatedAt: Date;
}

const ScholarshipSchema = new Schema<IScholarship>(
    {
        studentProfileId: {
            type: Schema.Types.ObjectId,
            ref: 'StudentProfile',
            required: [true, 'Student profile reference is required.'],
        },
        name: {
            type: String,
            required: [true, 'Scholarship name is required.'],
            trim: true,
            maxlength: [200, 'Name must not exceed 200 characters.'],
        },
        category: {
            type: String,
            enum: ['MERIT', 'NEED_BASED', 'SPORTS', 'STAFF_DEPENDENT', 'HAFIZ_E_QURAN', 'SIBLING', 'GOVERNMENT', 'OTHER'],
            required: [true, 'Scholarship category is required.'],
        },
        discountType: {
            type: String,
            enum: ['PERCENTAGE', 'FIXED'],
            required: [true, 'Discount type is required.'],
        },
        discountValue: {
            type: Number,
            required: [true, 'Discount value is required.'],
            min: [0, 'Discount value cannot be negative.'],
        },
        validFromSemester: {
            type: Number,
            required: true,
            min: 1,
        },
        validToSemester: {
            type: Number,
            required: true,
            min: 1,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        approvedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'approvedBy (User) is required.'],
        },
        approvedAt: {
            type: Date,
            default: Date.now,
        },
        notes: { type: String, trim: true, maxlength: 1000 },
    },
    {
        timestamps: true,
        collection: 'finance_scholarships',
    }
);

ScholarshipSchema.index({ studentProfileId: 1 });
ScholarshipSchema.index({ isActive: 1 });
ScholarshipSchema.index({ category: 1 });

const Scholarship: Model<IScholarship> =
    mongoose.models.Scholarship ||
    mongoose.model<IScholarship>('Scholarship', ScholarshipSchema);

export default Scholarship;
