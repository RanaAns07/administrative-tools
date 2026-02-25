import mongoose, { Schema, Document, Types } from 'mongoose';

export type AssetStatus = 'ACTIVE' | 'DISPOSED' | 'TRANSFERRED' | 'UNDER_MAINTENANCE';
export type DepreciationMethod = 'STRAIGHT_LINE' | 'DECLINING_BALANCE';

export interface IAsset extends Document {
    assetCode: string;            // AST-001
    assetName: string;
    assetCategory: string;        // e.g. "Computer Equipment", "Furniture"
    description?: string;
    purchaseDate: Date;
    purchasePrice: number;
    salvageValue: number;
    usefulLifeYears: number;
    depreciationMethod: DepreciationMethod;
    depreciationRate: number;     // Annual % for DDB
    accumulatedDepreciation: number;
    bookValue: number;            // purchasePrice - accumulatedDepreciation
    location?: string;
    serialNumber?: string;
    status: AssetStatus;
    assetAccountCode: string;     // CoA: Fixed Asset
    depreciationAccountCode: string;  // CoA: Depreciation Expense
    accDepreciationAccountCode: string; // CoA: Accumulated Depreciation
    purchaseJournalEntry?: Types.ObjectId;
    lastDepreciationDate?: Date;
    disposedAt?: Date;
    disposalAmount?: number;
    disposalJournalEntry?: Types.ObjectId;
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
}

const AssetSchema = new Schema<IAsset>(
    {
        assetCode: { type: String, unique: true, trim: true },
        assetName: { type: String, required: true, trim: true },
        assetCategory: { type: String, required: true },
        description: { type: String },
        purchaseDate: { type: Date, required: true },
        purchasePrice: { type: Number, required: true, min: 0 },
        salvageValue: { type: Number, default: 0, min: 0 },
        usefulLifeYears: { type: Number, required: true, min: 1 },
        depreciationMethod: {
            type: String,
            enum: ['STRAIGHT_LINE', 'DECLINING_BALANCE'],
            default: 'STRAIGHT_LINE',
        },
        depreciationRate: { type: Number, default: 0 },
        accumulatedDepreciation: { type: Number, default: 0 },
        bookValue: { type: Number, default: 0 },
        location: { type: String },
        serialNumber: { type: String },
        status: {
            type: String,
            enum: ['ACTIVE', 'DISPOSED', 'TRANSFERRED', 'UNDER_MAINTENANCE'],
            default: 'ACTIVE',
        },
        assetAccountCode: { type: String, required: true },
        depreciationAccountCode: { type: String, required: true },
        accDepreciationAccountCode: { type: String, required: true },
        purchaseJournalEntry: { type: Schema.Types.ObjectId, ref: 'JournalEntry' },
        lastDepreciationDate: { type: Date },
        disposedAt: { type: Date },
        disposalAmount: { type: Number },
        disposalJournalEntry: { type: Schema.Types.ObjectId, ref: 'JournalEntry' },
        createdBy: { type: String, required: true },
    },
    { timestamps: true }
);

AssetSchema.pre('save', async function () {
    this.bookValue = this.purchasePrice - this.accumulatedDepreciation;
    if (this.bookValue < this.salvageValue) this.bookValue = this.salvageValue;
});

AssetSchema.index({ assetCode: 1 }, { unique: true });
AssetSchema.index({ status: 1 });
AssetSchema.index({ assetCategory: 1 });

const Asset =
    mongoose.models.Asset ||
    mongoose.model<IAsset>('Asset', AssetSchema);

export default Asset;
