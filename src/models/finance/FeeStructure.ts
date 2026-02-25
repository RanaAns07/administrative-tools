import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IFeeComponent {
    name: string;             // e.g. "Tuition Fee", "Lab Fee"
    amount: number;
    accountCode: string;      // Maps to ChartOfAccount
    isMandatory: boolean;
}

export interface IFeeStructure extends Document {
    programName: string;      // e.g. "BS Computer Science"
    semester: string;         // e.g. "Fall 2025" or "Semester 1"
    academicYear: string;     // e.g. "2025-26"
    feeComponents: IFeeComponent[];
    totalAmount: number;
    lateFeePerDay: number;
    gracePeriodDays: number;
    isActive: boolean;
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
}

const FeeComponentSchema = new Schema<IFeeComponent>(
    {
        name: { type: String, required: true, trim: true },
        amount: { type: Number, required: true, min: 0 },
        accountCode: { type: String, required: true, trim: true },
        isMandatory: { type: Boolean, default: true },
    },
    { _id: true }
);

const FeeStructureSchema = new Schema<IFeeStructure>(
    {
        programName: { type: String, required: true, trim: true },
        semester: { type: String, required: true, trim: true },
        academicYear: { type: String, required: true, trim: true },
        feeComponents: { type: [FeeComponentSchema], required: true },
        totalAmount: { type: Number, required: true, min: 0 },
        lateFeePerDay: { type: Number, default: 0, min: 0 },
        gracePeriodDays: { type: Number, default: 5, min: 0 },
        isActive: { type: Boolean, default: true },
        createdBy: { type: String, required: true },
    },
    { timestamps: true }
);

FeeStructureSchema.index({ programName: 1, semester: 1, academicYear: 1 });

const FeeStructure =
    mongoose.models.FeeStructure ||
    mongoose.model<IFeeStructure>('FeeStructure', FeeStructureSchema);

export default FeeStructure;
