import mongoose, { Schema, Document, Types } from 'mongoose';

export type CustomerType = 'INDIVIDUAL' | 'CORPORATE' | 'GOVERNMENT' | 'NGO';
export type ARInvoiceStatus = 'DRAFT' | 'SENT' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE' | 'WRITTEN_OFF' | 'CANCELLED';

export interface ICustomer extends Document {
    customerCode: string;       // CUS-001
    customerName: string;
    customerType: CustomerType;
    contactPerson?: string;
    email?: string;
    phone?: string;
    address?: string;
    ntn?: string;
    creditLimit: number;
    paymentTermsDays: number;
    receivableAccountCode: string;
    isActive: boolean;
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface IARInvoice extends Document {
    invoiceNumber: string;      // ARINV-2025-001
    customer: Types.ObjectId;
    invoiceDate: Date;
    dueDate: Date;
    description: string;
    items: Array<{
        description: string;
        quantity: number;
        unitPrice: number;
        total: number;
        accountCode: string;
    }>;
    subtotal: number;
    taxAmount: number;
    totalAmount: number;
    paidAmount: number;
    outstandingAmount: number;
    status: ARInvoiceStatus;
    journalEntry?: Types.ObjectId;
    paymentJournalEntries: Types.ObjectId[];
    notes?: string;
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
}

const CustomerSchema = new Schema<ICustomer>(
    {
        customerCode: { type: String, unique: true, trim: true },
        customerName: { type: String, required: true, trim: true },
        customerType: {
            type: String,
            enum: ['INDIVIDUAL', 'CORPORATE', 'GOVERNMENT', 'NGO'],
            default: 'INDIVIDUAL',
        },
        contactPerson: { type: String },
        email: { type: String },
        phone: { type: String },
        address: { type: String },
        ntn: { type: String },
        creditLimit: { type: Number, default: 0 },
        paymentTermsDays: { type: Number, default: 30 },
        receivableAccountCode: { type: String, required: true },
        isActive: { type: Boolean, default: true },
        createdBy: { type: String, required: true },
    },
    { timestamps: true }
);

const ARInvoiceItemSchema = new Schema({
    description: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    total: { type: Number, required: true, min: 0 },
    accountCode: { type: String, required: true },
}, { _id: true });

const ARInvoiceSchema = new Schema<IARInvoice>(
    {
        invoiceNumber: { type: String, unique: true, trim: true },
        customer: { type: Schema.Types.ObjectId, ref: 'Customer', required: true },
        invoiceDate: { type: Date, required: true },
        dueDate: { type: Date, required: true },
        description: { type: String, required: true },
        items: { type: [ARInvoiceItemSchema], default: [] },
        subtotal: { type: Number, default: 0 },
        taxAmount: { type: Number, default: 0 },
        totalAmount: { type: Number, required: true, min: 0 },
        paidAmount: { type: Number, default: 0 },
        outstandingAmount: { type: Number, default: 0 },
        status: {
            type: String,
            enum: ['DRAFT', 'SENT', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'WRITTEN_OFF', 'CANCELLED'],
            default: 'DRAFT',
        },
        journalEntry: { type: Schema.Types.ObjectId, ref: 'JournalEntry' },
        paymentJournalEntries: [{ type: Schema.Types.ObjectId, ref: 'JournalEntry' }],
        notes: { type: String },
        createdBy: { type: String, required: true },
    },
    { timestamps: true }
);

ARInvoiceSchema.pre('save', async function () {
    this.outstandingAmount = this.totalAmount - this.paidAmount;
    if (this.outstandingAmount < 0) this.outstandingAmount = 0;
});

const Customer =
    mongoose.models.Customer ||
    mongoose.model<ICustomer>('Customer', CustomerSchema);

const ARInvoice =
    mongoose.models.ARInvoice ||
    mongoose.model<IARInvoice>('ARInvoice', ARInvoiceSchema);

export { Customer, ARInvoice };
