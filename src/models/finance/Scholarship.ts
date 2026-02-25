import mongoose, { Schema, Document, Types } from 'mongoose';

export type ScholarshipType =
    | 'MERIT' | 'NEED_BASED' | 'SPORTS' | 'STAFF_DEPENDENT' | 'HAFIZ_E_QURAN'
    | 'SIBLING' | 'GOVERNMENT' | 'OTHER';

export interface IScholarship extends Document {
    studentId: string;
    studentName: string;
    rollNumber: string;
    feeInvoice: Types.ObjectId;
    scholarshipType: ScholarshipType;
    description?: string;
    discountType: 'PERCENTAGE' | 'FIXED';
    discountValue: number;      // % or fixed amount
    discountAmount: number;     // Actual computed PKR amount
    journalEntry?: Types.ObjectId;
    approvedBy: string;
    approvedAt: Date;
    academicYear: string;
    isActive: boolean;
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
}

const ScholarshipSchema = new Schema<IScholarship>(
    {
        studentId: { type: String, required: true },
        studentName: { type: String, required: true },
        rollNumber: { type: String, required: true },
        feeInvoice: { type: Schema.Types.ObjectId, ref: 'FeeInvoice', required: true },
        scholarshipType: {
            type: String,
            enum: ['MERIT', 'NEED_BASED', 'SPORTS', 'STAFF_DEPENDENT', 'HAFIZ_E_QURAN', 'SIBLING', 'GOVERNMENT', 'OTHER'],
            required: true,
        },
        description: { type: String },
        discountType: { type: String, enum: ['PERCENTAGE', 'FIXED'], required: true },
        discountValue: { type: Number, required: true, min: 0 },
        discountAmount: { type: Number, required: true, min: 0 },
        journalEntry: { type: Schema.Types.ObjectId, ref: 'JournalEntry' },
        approvedBy: { type: String, required: true },
        approvedAt: { type: Date, required: true },
        academicYear: { type: String, required: true },
        isActive: { type: Boolean, default: true },
        createdBy: { type: String, required: true },
    },
    { timestamps: true }
);

ScholarshipSchema.index({ studentId: 1 });
ScholarshipSchema.index({ feeInvoice: 1 });

const Scholarship =
    mongoose.models.Scholarship ||
    mongoose.model<IScholarship>('Scholarship', ScholarshipSchema);

export default Scholarship;
