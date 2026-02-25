import mongoose, { Schema, Document, Types } from 'mongoose';

export type VendorInvoiceStatus = 'PENDING' | 'APPROVED' | 'PARTIALLY_PAID' | 'PAID' | 'DISPUTED' | 'CANCELLED';

export interface IVendorInvoice extends Document {
    vendorInvoiceNumber: string;    // External invoice number from vendor
    internalReference: string;       // VIN-2025-00001
    vendor: Types.ObjectId;
    purchaseOrder?: Types.ObjectId;
    invoiceDate: Date;
    dueDate: Date;
    subtotal: number;
    taxAmount: number;
    totalAmount: number;
    paidAmount: number;
    outstandingAmount: number;
    status: VendorInvoiceStatus;
    journalEntry?: Types.ObjectId;  // JE posted on approval
    paymentJournalEntries: Types.ObjectId[];
    approvedBy?: string;
    approvedAt?: Date;
    description?: string;
    expenseAccountCode: string;     // CoA code for expense
    payableAccountCode: string;
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
}

const VendorInvoiceSchema = new Schema<IVendorInvoice>(
    {
        vendorInvoiceNumber: { type: String, required: true, trim: true },
        internalReference: { type: String, unique: true, trim: true },
        vendor: { type: Schema.Types.ObjectId, ref: 'Vendor', required: true },
        purchaseOrder: { type: Schema.Types.ObjectId, ref: 'PurchaseOrder' },
        invoiceDate: { type: Date, required: true },
        dueDate: { type: Date, required: true },
        subtotal: { type: Number, required: true, min: 0 },
        taxAmount: { type: Number, default: 0 },
        totalAmount: { type: Number, required: true, min: 0 },
        paidAmount: { type: Number, default: 0 },
        outstandingAmount: { type: Number, default: 0 },
        status: {
            type: String,
            enum: ['PENDING', 'APPROVED', 'PARTIALLY_PAID', 'PAID', 'DISPUTED', 'CANCELLED'],
            default: 'PENDING',
        },
        journalEntry: { type: Schema.Types.ObjectId, ref: 'JournalEntry' },
        paymentJournalEntries: [{ type: Schema.Types.ObjectId, ref: 'JournalEntry' }],
        approvedBy: { type: String },
        approvedAt: { type: Date },
        description: { type: String },
        expenseAccountCode: { type: String, required: true },
        payableAccountCode: { type: String, required: true },
        createdBy: { type: String, required: true },
    },
    { timestamps: true }
);

VendorInvoiceSchema.pre('save', async function () {
    this.outstandingAmount = this.totalAmount - this.paidAmount;
    if (this.outstandingAmount < 0) this.outstandingAmount = 0;
});

VendorInvoiceSchema.index({ vendor: 1 });
VendorInvoiceSchema.index({ status: 1 });
VendorInvoiceSchema.index({ dueDate: 1 });

const VendorInvoice =
    mongoose.models.VendorInvoice ||
    mongoose.model<IVendorInvoice>('VendorInvoice', VendorInvoiceSchema);

export default VendorInvoice;
