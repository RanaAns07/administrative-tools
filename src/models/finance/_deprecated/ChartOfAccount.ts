import mongoose, { Schema, Document, Types } from 'mongoose';

export type AccountType = 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';
export type AccountSubType =
    | 'CURRENT_ASSET' | 'NON_CURRENT_ASSET' | 'CURRENT_LIABILITY' | 'NON_CURRENT_LIABILITY'
    | 'RETAINED_EARNINGS' | 'SHARE_CAPITAL' | 'OPERATING_REVENUE' | 'NON_OPERATING_REVENUE'
    | 'COST_OF_SERVICES' | 'OPERATING_EXPENSE' | 'NON_OPERATING_EXPENSE' | 'GENERAL';

export interface IChartOfAccount extends Document {
    accountCode: string;
    accountName: string;
    accountType: AccountType;
    accountSubType: AccountSubType;
    parentAccount?: Types.ObjectId;
    description?: string;
    isControl: boolean;          // Control/header accounts have sub-accounts
    isActive: boolean;
    normalBalance: 'DEBIT' | 'CREDIT'; // ASSET+EXPENSE = DEBIT; LIABILITY+EQUITY+REVENUE = CREDIT
    level: number;               // 1=root, 2=control, 3=detail
    openingBalance: number;
    createdAt: Date;
    updatedAt: Date;
}

const ChartOfAccountSchema = new Schema<IChartOfAccount>(
    {
        accountCode: { type: String, required: true, unique: true, trim: true },
        accountName: { type: String, required: true, trim: true },
        accountType: {
            type: String,
            required: true,
            enum: ['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE'],
        },
        accountSubType: {
            type: String,
            required: true,
            enum: [
                'CURRENT_ASSET', 'NON_CURRENT_ASSET', 'CURRENT_LIABILITY', 'NON_CURRENT_LIABILITY',
                'RETAINED_EARNINGS', 'SHARE_CAPITAL', 'OPERATING_REVENUE', 'NON_OPERATING_REVENUE',
                'COST_OF_SERVICES', 'OPERATING_EXPENSE', 'NON_OPERATING_EXPENSE', 'GENERAL',
            ],
        },
        parentAccount: { type: Schema.Types.ObjectId, ref: 'ChartOfAccount', default: null },
        description: { type: String, trim: true },
        isControl: { type: Boolean, default: false },
        isActive: { type: Boolean, default: true },
        normalBalance: { type: String, enum: ['DEBIT', 'CREDIT'], required: true },
        level: { type: Number, required: true, min: 1, max: 5 },
        openingBalance: { type: Number, default: 0 },
    },
    { timestamps: true }
);

// Prevent deleting accounts that have children
ChartOfAccountSchema.index({ accountCode: 1 }, { unique: true });
ChartOfAccountSchema.index({ accountType: 1 });
ChartOfAccountSchema.index({ parentAccount: 1 });

const ChartOfAccount =
    mongoose.models.ChartOfAccount ||
    mongoose.model<IChartOfAccount>('ChartOfAccount', ChartOfAccountSchema);

export default ChartOfAccount;
