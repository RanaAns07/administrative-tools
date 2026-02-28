import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IDepartment extends Document {
    name: string;
    code: string;
    headOfDepartment?: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const DepartmentSchema = new Schema<IDepartment>(
    {
        name: {
            type: String,
            required: [true, 'Department name is required.'],
            unique: true,
            trim: true,
            maxlength: [200, 'Department name must not exceed 200 characters.'],
        },
        code: {
            type: String,
            required: [true, 'Department code is required.'],
            unique: true,
            trim: true,
            uppercase: true,
            maxlength: [20, 'Department code must not exceed 20 characters.'],
        },
        headOfDepartment: {
            type: String,
            trim: true,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
    },
    {
        timestamps: true,
        collection: 'university_departments',
    }
);

DepartmentSchema.index({ code: 1 }, { unique: true });
DepartmentSchema.index({ isActive: 1 });

const Department: Model<IDepartment> =
    mongoose.models.Department ||
    mongoose.model<IDepartment>('Department', DepartmentSchema);

export default Department;
