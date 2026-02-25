import mongoose, { Schema, Document, Types } from 'mongoose';

export type PurchaseRequestStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'CONVERTED_TO_PO';

export interface IPRItem {
    description: string;
    quantity: number;
    estimatedUnitPrice: number;
    estimatedTotal: number;
    accountCode: string;
}

export interface IPurchaseRequest extends Document {
    prNumber: string;           // PR-2025-00001
    requestedBy: string;
    requestedAt: Date;
    department: string;
    justification: string;
    items: IPRItem[];
    totalEstimated: number;
    status: PurchaseRequestStatus;
    approvedBy?: string;
    approvedAt?: Date;
    rejectedBy?: string;
    rejectedAt?: Date;
    rejectionReason?: string;
    purchaseOrder?: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const PRItemSchema = new Schema<IPRItem>({
    description: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    estimatedUnitPrice: { type: Number, required: true, min: 0 },
    estimatedTotal: { type: Number, required: true, min: 0 },
    accountCode: { type: String, required: true },
}, { _id: true });

const PurchaseRequestSchema = new Schema<IPurchaseRequest>(
    {
        prNumber: { type: String, unique: true, trim: true },
        requestedBy: { type: String, required: true },
        requestedAt: { type: Date, default: Date.now },
        department: { type: String, required: true },
        justification: { type: String, required: true },
        items: { type: [PRItemSchema], required: true },
        totalEstimated: { type: Number, required: true, min: 0 },
        status: {
            type: String,
            enum: ['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'CONVERTED_TO_PO'],
            default: 'DRAFT',
        },
        approvedBy: { type: String },
        approvedAt: { type: Date },
        rejectedBy: { type: String },
        rejectedAt: { type: Date },
        rejectionReason: { type: String },
        purchaseOrder: { type: Schema.Types.ObjectId, ref: 'PurchaseOrder' },
    },
    { timestamps: true }
);

const PurchaseRequest =
    mongoose.models.PurchaseRequest ||
    mongoose.model<IPurchaseRequest>('PurchaseRequest', PurchaseRequestSchema);

export default PurchaseRequest;
