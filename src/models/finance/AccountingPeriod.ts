import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IAccountingPeriod extends Document {
    fiscalYear: Types.ObjectId;
    periodNumber: number;       // 1–12
    periodName: string;         // e.g. "July 2025"
    startDate: Date;
    endDate: Date;
    isLocked: boolean;
    lockedAt?: Date;
    lockedBy?: string;          // userId
    createdAt: Date;
    updatedAt: Date;
}

const AccountingPeriodSchema = new Schema<IAccountingPeriod>(
    {
        fiscalYear: { type: Schema.Types.ObjectId, ref: 'FiscalYear', required: true },
        periodNumber: { type: Number, required: true, min: 1, max: 13 }, // 13 for adjustment period
        periodName: { type: String, required: true, trim: true },
        startDate: { type: Date, required: true },
        endDate: { type: Date, required: true },
        isLocked: { type: Boolean, default: false },
        lockedAt: { type: Date },
        lockedBy: { type: String },
    },
    { timestamps: true }
);

AccountingPeriodSchema.index({ fiscalYear: 1, periodNumber: 1 }, { unique: true });
AccountingPeriodSchema.index({ startDate: 1, endDate: 1 });

const AccountingPeriod =
    mongoose.models.AccountingPeriod ||
    mongoose.model<IAccountingPeriod>('AccountingPeriod', AccountingPeriodSchema);

export default AccountingPeriod;
