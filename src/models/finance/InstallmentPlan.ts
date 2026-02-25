import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IInstallment {
    installmentNumber: number;
    dueDate: Date;
    amount: number;
    paidAmount: number;
    isPaid: boolean;
    paidAt?: Date;
    payment?: Types.ObjectId;
}

export interface IInstallmentPlan extends Document {
    feeInvoice: Types.ObjectId;
    studentId: string;
    totalAmount: number;
    numberOfInstallments: number;
    installments: IInstallment[];
    isCompleted: boolean;
    createdBy: string;
    approvedBy?: string;
    createdAt: Date;
    updatedAt: Date;
}

const InstallmentSchema = new Schema<IInstallment>(
    {
        installmentNumber: { type: Number, required: true },
        dueDate: { type: Date, required: true },
        amount: { type: Number, required: true, min: 0 },
        paidAmount: { type: Number, default: 0 },
        isPaid: { type: Boolean, default: false },
        paidAt: { type: Date },
        payment: { type: Schema.Types.ObjectId, ref: 'FeePayment' },
    },
    { _id: true }
);

const InstallmentPlanSchema = new Schema<IInstallmentPlan>(
    {
        feeInvoice: { type: Schema.Types.ObjectId, ref: 'FeeInvoice', required: true },
        studentId: { type: String, required: true },
        totalAmount: { type: Number, required: true },
        numberOfInstallments: { type: Number, required: true, min: 2, max: 12 },
        installments: { type: [InstallmentSchema], required: true },
        isCompleted: { type: Boolean, default: false },
        createdBy: { type: String, required: true },
        approvedBy: { type: String },
    },
    { timestamps: true }
);

InstallmentPlanSchema.index({ feeInvoice: 1 });
InstallmentPlanSchema.index({ studentId: 1 });

const InstallmentPlan =
    mongoose.models.InstallmentPlan ||
    mongoose.model<IInstallmentPlan>('InstallmentPlan', InstallmentPlanSchema);

export default InstallmentPlan;
