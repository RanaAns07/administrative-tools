import mongoose, { Schema, Document, Types } from 'mongoose';

export type EmployeeType = 'PERMANENT' | 'CONTRACT' | 'VISITING' | 'DAILY_WAGE';
export type EmployeeStatus = 'ACTIVE' | 'INACTIVE' | 'TERMINATED' | 'ON_LEAVE';

export interface IEmployee extends Document {
    employeeCode: string;       // EMP-001
    name: string;
    cnic: string;
    designation: string;
    department: string;
    employeeType: EmployeeType;
    status: EmployeeStatus;
    joiningDate: Date;
    terminationDate?: Date;
    email?: string;
    phone?: string;
    bankAccountNumber?: string;
    bankName?: string;
    bankAccountTitle?: string;
    ntn?: string;
    basicSalary: number;
    payrollAccountCode: string;   // CoA for salary expense
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
}

const EmployeeSchema = new Schema<IEmployee>(
    {
        employeeCode: { type: String, unique: true, trim: true },
        name: { type: String, required: true, trim: true },
        cnic: { type: String, required: true, unique: true, trim: true },
        designation: { type: String, required: true },
        department: { type: String, required: true },
        employeeType: {
            type: String,
            enum: ['PERMANENT', 'CONTRACT', 'VISITING', 'DAILY_WAGE'],
            required: true,
        },
        status: {
            type: String,
            enum: ['ACTIVE', 'INACTIVE', 'TERMINATED', 'ON_LEAVE'],
            default: 'ACTIVE',
        },
        joiningDate: { type: Date, required: true },
        terminationDate: { type: Date },
        email: { type: String },
        phone: { type: String },
        bankAccountNumber: { type: String },
        bankName: { type: String },
        bankAccountTitle: { type: String },
        ntn: { type: String },
        basicSalary: { type: Number, required: true, min: 0 },
        payrollAccountCode: { type: String, required: true },
        createdBy: { type: String, required: true },
    },
    { timestamps: true }
);

EmployeeSchema.index({ employeeCode: 1 }, { unique: true });
EmployeeSchema.index({ cnic: 1 }, { unique: true });
EmployeeSchema.index({ department: 1 });
EmployeeSchema.index({ status: 1 });

const Employee =
    mongoose.models.Employee ||
    mongoose.model<IEmployee>('Employee', EmployeeSchema);

export default Employee;
