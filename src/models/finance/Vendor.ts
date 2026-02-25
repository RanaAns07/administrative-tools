import mongoose, { Schema, Document } from 'mongoose';

export type VendorStatus = 'ACTIVE' | 'INACTIVE' | 'BLACKLISTED';

export interface IVendor extends Document {
    vendorCode: string;         // VND-001
    companyName: string;
    contactPerson?: string;
    email?: string;
    phone?: string;
    address?: string;
    ntn?: string;               // National Tax Number (Pakistan)
    strn?: string;              // Sales Tax Registration Number
    bankName?: string;
    bankAccountNumber?: string;
    bankAccountTitle?: string;
    payableAccountCode: string; // CoA account code for AP
    status: VendorStatus;
    paymentTermsDays: number;   // e.g. NET-30
    isGSTRegistered: boolean;
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
}

const VendorSchema = new Schema<IVendor>(
    {
        vendorCode: { type: String, unique: true, trim: true },
        companyName: { type: String, required: true, trim: true },
        contactPerson: { type: String, trim: true },
        email: { type: String, trim: true },
        phone: { type: String, trim: true },
        address: { type: String },
        ntn: { type: String, trim: true },
        strn: { type: String, trim: true },
        bankName: { type: String },
        bankAccountNumber: { type: String },
        bankAccountTitle: { type: String },
        payableAccountCode: { type: String, required: true },
        status: { type: String, enum: ['ACTIVE', 'INACTIVE', 'BLACKLISTED'], default: 'ACTIVE' },
        paymentTermsDays: { type: Number, default: 30 },
        isGSTRegistered: { type: Boolean, default: false },
        createdBy: { type: String, required: true },
    },
    { timestamps: true }
);

VendorSchema.index({ vendorCode: 1 }, { unique: true });
VendorSchema.index({ companyName: 1 });

const Vendor =
    mongoose.models.Vendor ||
    mongoose.model<IVendor>('Vendor', VendorSchema);

export default Vendor;
