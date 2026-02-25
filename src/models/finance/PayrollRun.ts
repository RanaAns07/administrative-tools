import mongoose, { Schema, Document, Types } from 'mongoose';

export type PayrollRunStatus = 'DRAFT' | 'PROCESSING' | 'APPROVED' | 'POSTED' | 'CANCELLED';

export interface IPayslipLine {
    employee: Types.ObjectId;
    employeeCode: string;
    employeeName: string;
    basicSalary: number;
    allowances: number;
    grossSalary: number;
    incomeTax: number;
    providentFund: number;
    loanDeduction: number;
    otherDeductions: number;
    totalDeductions: number;
    netSalary: number;
    workingDays: number;
    presentDays: number;
    leaveDays: number;
}

export interface IPayrollRun extends Document {
    runNumber: string;          // PAY-2025-07
    month: number;              // 1-12
    year: number;
    periodStart: Date;
    periodEnd: Date;
    status: PayrollRunStatus;
    payslips: IPayslipLine[];
    totalGross: number;
    totalDeductions: number;
    totalNetPayable: number;
    journalEntry?: Types.ObjectId;
    processedBy?: string;
    processedAt?: Date;
    approvedBy?: string;
    approvedAt?: Date;
    postedBy?: string;
    postedAt?: Date;
    notes?: string;
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
}

const PayslipLineSchema = new Schema<IPayslipLine>({
    employee: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
    employeeCode: { type: String },
    employeeName: { type: String },
    basicSalary: { type: Number, default: 0 },
    allowances: { type: Number, default: 0 },
    grossSalary: { type: Number, default: 0 },
    incomeTax: { type: Number, default: 0 },
    providentFund: { type: Number, default: 0 },
    loanDeduction: { type: Number, default: 0 },
    otherDeductions: { type: Number, default: 0 },
    totalDeductions: { type: Number, default: 0 },
    netSalary: { type: Number, default: 0 },
    workingDays: { type: Number, default: 0 },
    presentDays: { type: Number, default: 0 },
    leaveDays: { type: Number, default: 0 },
}, { _id: true });

const PayrollRunSchema = new Schema<IPayrollRun>(
    {
        runNumber: { type: String, unique: true, trim: true },
        month: { type: Number, required: true, min: 1, max: 12 },
        year: { type: Number, required: true },
        periodStart: { type: Date, required: true },
        periodEnd: { type: Date, required: true },
        status: {
            type: String,
            enum: ['DRAFT', 'PROCESSING', 'APPROVED', 'POSTED', 'CANCELLED'],
            default: 'DRAFT',
        },
        payslips: { type: [PayslipLineSchema], default: [] },
        totalGross: { type: Number, default: 0 },
        totalDeductions: { type: Number, default: 0 },
        totalNetPayable: { type: Number, default: 0 },
        journalEntry: { type: Schema.Types.ObjectId, ref: 'JournalEntry' },
        processedBy: { type: String },
        processedAt: { type: Date },
        approvedBy: { type: String },
        approvedAt: { type: Date },
        postedBy: { type: String },
        postedAt: { type: Date },
        notes: { type: String },
        createdBy: { type: String, required: true },
    },
    { timestamps: true }
);

PayrollRunSchema.index({ month: 1, year: 1 }, { unique: true });
PayrollRunSchema.index({ status: 1 });

const PayrollRun =
    mongoose.models.PayrollRun ||
    mongoose.model<IPayrollRun>('PayrollRun', PayrollRunSchema);

export default PayrollRun;
