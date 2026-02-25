import mongoose, { Schema, Document, Types } from 'mongoose';

export type FeeInvoiceStatus = 'UNPAID' | 'PARTIAL' | 'PAID' | 'OVERDUE' | 'WRITTEN_OFF' | 'CANCELLED';

export interface IFeeInvoice extends Document {
    invoiceNumber: string;      // Auto-gen: INV-2025-00001
    studentId: string;
    studentName: string;
    rollNumber: string;
    program: string;
    feeStructure: Types.ObjectId;
    semester: string;
    academicYear: string;
    dueDate: Date;
    totalAmount: number;
    discountAmount: number;     // From scholarships
    paidAmount: number;
    penaltyAmount: number;      // Late fees accumulated
    outstandingAmount: number;  // totalAmount - discountAmount - paidAmount + penaltyAmount
    status: FeeInvoiceStatus;
    installmentPlan?: Types.ObjectId;
    notes?: string;
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
}

const FeeInvoiceSchema = new Schema<IFeeInvoice>(
    {
        invoiceNumber: { type: String, unique: true, trim: true },
        studentId: { type: String, required: true, trim: true },
        studentName: { type: String, required: true, trim: true },
        rollNumber: { type: String, required: true, trim: true },
        program: { type: String, required: true, trim: true },
        feeStructure: { type: Schema.Types.ObjectId, ref: 'FeeStructure', required: true },
        semester: { type: String, required: true, trim: true },
        academicYear: { type: String, required: true, trim: true },
        dueDate: { type: Date, required: true },
        totalAmount: { type: Number, required: true, min: 0 },
        discountAmount: { type: Number, default: 0, min: 0 },
        paidAmount: { type: Number, default: 0, min: 0 },
        penaltyAmount: { type: Number, default: 0, min: 0 },
        outstandingAmount: { type: Number, default: 0 },
        status: {
            type: String,
            enum: ['UNPAID', 'PARTIAL', 'PAID', 'OVERDUE', 'WRITTEN_OFF', 'CANCELLED'],
            default: 'UNPAID',
        },
        installmentPlan: { type: Schema.Types.ObjectId, ref: 'InstallmentPlan' },
        notes: { type: String },
        createdBy: { type: String, required: true },
    },
    { timestamps: true }
);

FeeInvoiceSchema.index({ studentId: 1 });
FeeInvoiceSchema.index({ rollNumber: 1 });
FeeInvoiceSchema.index({ status: 1 });
FeeInvoiceSchema.index({ dueDate: 1 });
FeeInvoiceSchema.index({ invoiceNumber: 1 }, { unique: true });

// Auto-compute outstanding before save
FeeInvoiceSchema.pre('save', async function () {
    this.outstandingAmount = this.totalAmount - this.discountAmount - this.paidAmount + this.penaltyAmount;
    if (this.outstandingAmount < 0) this.outstandingAmount = 0;

    // Auto-update status
    if (this.status !== 'CANCELLED' && this.status !== 'WRITTEN_OFF') {
        if (this.paidAmount >= this.totalAmount - this.discountAmount) {
            this.status = 'PAID';
        } else if (this.paidAmount > 0) {
            this.status = 'PARTIAL';
        } else if (new Date() > this.dueDate) {
            this.status = 'OVERDUE';
        } else {
            this.status = 'UNPAID';
        }
    }
});

const FeeInvoice =
    mongoose.models.FeeInvoice ||
    mongoose.model<IFeeInvoice>('FeeInvoice', FeeInvoiceSchema);

export default FeeInvoice;
