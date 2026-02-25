import mongoose, { Schema, Document, Types } from 'mongoose';

export type POStatus = 'OPEN' | 'PARTIALLY_RECEIVED' | 'RECEIVED' | 'INVOICED' | 'CANCELLED';

export interface IPOItem {
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
    receivedQuantity: number;
    accountCode: string;
}

export interface IPurchaseOrder extends Document {
    poNumber: string;           // PO-2025-00001
    purchaseRequest?: Types.ObjectId;
    vendor: Types.ObjectId;
    orderDate: Date;
    expectedDeliveryDate?: Date;
    deliveryAddress?: string;
    items: IPOItem[];
    subtotal: number;
    taxAmount: number;
    totalAmount: number;
    status: POStatus;
    approvedBy: string;
    approvedAt: Date;
    notes?: string;
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
}

const POItemSchema = new Schema<IPOItem>({
    description: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    total: { type: Number, required: true, min: 0 },
    receivedQuantity: { type: Number, default: 0 },
    accountCode: { type: String, required: true },
}, { _id: true });

const PurchaseOrderSchema = new Schema<IPurchaseOrder>(
    {
        poNumber: { type: String, unique: true, trim: true },
        purchaseRequest: { type: Schema.Types.ObjectId, ref: 'PurchaseRequest' },
        vendor: { type: Schema.Types.ObjectId, ref: 'Vendor', required: true },
        orderDate: { type: Date, required: true, default: Date.now },
        expectedDeliveryDate: { type: Date },
        deliveryAddress: { type: String },
        items: { type: [POItemSchema], required: true },
        subtotal: { type: Number, required: true, min: 0 },
        taxAmount: { type: Number, default: 0 },
        totalAmount: { type: Number, required: true, min: 0 },
        status: {
            type: String,
            enum: ['OPEN', 'PARTIALLY_RECEIVED', 'RECEIVED', 'INVOICED', 'CANCELLED'],
            default: 'OPEN',
        },
        approvedBy: { type: String, required: true },
        approvedAt: { type: Date, required: true },
        notes: { type: String },
        createdBy: { type: String, required: true },
    },
    { timestamps: true }
);

const PurchaseOrder =
    mongoose.models.PurchaseOrder ||
    mongoose.model<IPurchaseOrder>('PurchaseOrder', PurchaseOrderSchema);

export default PurchaseOrder;
