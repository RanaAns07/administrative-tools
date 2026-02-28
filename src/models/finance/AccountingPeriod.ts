/**
 * @file AccountingPeriod.ts
 * @description Month-Level Lock/Unlock Control
 *
 * When a period is LOCKED:
 *   - No new transactions can be posted for that month
 *   - FinanceTransactionService.assertPeriodOpen() throws PERIOD_LOCKED
 *   - This is checked BEFORE any DB write in every service method
 *
 * Locking is done at the month+year level. Once locked, historical data
 * for that month becomes immutable for reporting and audit purposes.
 *
 * Only Finance Admin role can lock/unlock periods.
 */

import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export type PeriodStatus = 'OPEN' | 'LOCKED';

export interface IAccountingPeriod extends Document {
    month: number;           // 1–12
    year: number;
    status: PeriodStatus;
    lockedBy?: Types.ObjectId;
    lockedAt?: Date;
    unlockedBy?: Types.ObjectId;
    unlockedAt?: Date;
    notes?: string;
    createdAt: Date;
    updatedAt: Date;
}

const AccountingPeriodSchema = new Schema<IAccountingPeriod>(
    {
        month: {
            type: Number,
            required: true,
            min: [1, 'Month must be 1–12.'],
            max: [12, 'Month must be 1–12.'],
        },
        year: {
            type: Number,
            required: true,
            min: [2020, 'Year must be 2020 or later.'],
        },
        status: {
            type: String,
            enum: ['OPEN', 'LOCKED'],
            default: 'OPEN',
        },
        lockedBy: { type: Schema.Types.ObjectId, ref: 'User' },
        lockedAt: { type: Date },
        unlockedBy: { type: Schema.Types.ObjectId, ref: 'User' },
        unlockedAt: { type: Date },
        notes: { type: String, trim: true, maxlength: 500 },
    },
    {
        timestamps: true,
        collection: 'finance_accounting_periods',
    }
);

// A period exists once per month+year
AccountingPeriodSchema.index({ month: 1, year: 1 }, { unique: true });
AccountingPeriodSchema.index({ status: 1 });

const AccountingPeriod: Model<IAccountingPeriod> =
    mongoose.models.AccountingPeriod ||
    mongoose.model<IAccountingPeriod>('AccountingPeriod', AccountingPeriodSchema);

export default AccountingPeriod;
