import mongoose, { Schema, Document } from 'mongoose';

export type FiscalYearStatus = 'OPEN' | 'CLOSED';

export interface IFiscalYear extends Document {
    name: string;          // e.g. "FY 2025-26"
    startDate: Date;
    endDate: Date;
    status: FiscalYearStatus;
    closedAt?: Date;
    closedBy?: string;     // userId of who closed it
    notes?: string;
    createdAt: Date;
    updatedAt: Date;
}

const FiscalYearSchema = new Schema<IFiscalYear>(
    {
        name: { type: String, required: true, unique: true, trim: true },
        startDate: { type: Date, required: true },
        endDate: { type: Date, required: true },
        status: { type: String, enum: ['OPEN', 'CLOSED'], default: 'OPEN' },
        closedAt: { type: Date },
        closedBy: { type: String },
        notes: { type: String },
    },
    { timestamps: true }
);

// Ensure no overlapping fiscal years
FiscalYearSchema.index({ startDate: 1, endDate: 1 });

const FiscalYear =
    mongoose.models.FiscalYear ||
    mongoose.model<IFiscalYear>('FiscalYear', FiscalYearSchema);

export default FiscalYear;
