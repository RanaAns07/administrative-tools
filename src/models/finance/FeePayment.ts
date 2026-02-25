import mongoose, { Schema, Document, Types } from 'mongoose';

export type PaymentMode = 'CASH' | 'BANK_TRANSFER' | 'CHEQUE' | 'ONLINE' | 'DD';
export type PaymentStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface IFeePayment extends Document {
    receiptNumber: string;      // Auto-gen: RCP-2025-00001
    feeInvoice: Types.ObjectId;
    installment?: Types.ObjectId;
    amount: number;
    paymentMode: PaymentMode;
    paymentDate: Date;
    chequeNumber?: string;
    bankName?: string;
    transactionReference?: string;
    receivedBy: string;
    // Approval workflow (CASH is auto-approved; CHEQUE/BANK_TRANSFER require admin approval)
    status: PaymentStatus;
    approvedBy?: string;
    approvedAt?: Date;
    rejectionReason?: string;
    journalEntry?: Types.ObjectId;  // Linked JE after posting
    isReversal: boolean;
    reversalOf?: Types.ObjectId;    // Original payment this reverses
    reversedBy?: string;
    reversedAt?: Date;
    reversalReason?: string;
    notes?: string;
    createdAt: Date;
    updatedAt: Date;
}

const FeePaymentSchema = new Schema<IFeePayment>(
    {
        receiptNumber: { type: String, unique: true, trim: true },
        feeInvoice: { type: Schema.Types.ObjectId, ref: 'FeeInvoice', required: true },
        installment: { type: Schema.Types.ObjectId, ref: 'InstallmentPlan' },
        amount: { type: Number, required: true, min: 0.01 },
        paymentMode: {
            type: String,
            enum: ['CASH', 'BANK_TRANSFER', 'CHEQUE', 'ONLINE', 'DD'],
            required: true,
        },
        paymentDate: { type: Date, required: true },
        chequeNumber: { type: String, trim: true },
        bankName: { type: String, trim: true },
        transactionReference: { type: String, trim: true },
        receivedBy: { type: String, required: true },
        status: {
            type: String,
            enum: ['PENDING', 'APPROVED', 'REJECTED'],
            default: 'PENDING',
        },
        approvedBy: { type: String },
        approvedAt: { type: Date },
        rejectionReason: { type: String },
        journalEntry: { type: Schema.Types.ObjectId, ref: 'JournalEntry' },
        isReversal: { type: Boolean, default: false },
        reversalOf: { type: Schema.Types.ObjectId, ref: 'FeePayment' },
        reversedBy: { type: String },
        reversedAt: { type: Date },
        reversalReason: { type: String },
        notes: { type: String },
    },
    { timestamps: true }
);

FeePaymentSchema.index({ feeInvoice: 1 });
FeePaymentSchema.index({ receiptNumber: 1 }, { unique: true });
FeePaymentSchema.index({ paymentDate: 1 });

const FeePayment =
    mongoose.models.FeePayment ||
    mongoose.model<IFeePayment>('FeePayment', FeePaymentSchema);

export default FeePayment;
