import mongoose, { Schema, Document, Types } from 'mongoose';

export type BudgetStatus = 'DRAFT' | 'APPROVED' | 'ACTIVE' | 'CLOSED';

export interface IBudgetLine {
    account: Types.ObjectId;
    accountCode: string;
    accountName: string;
    budgetedAmount: number;
    q1Amount: number;
    q2Amount: number;
    q3Amount: number;
    q4Amount: number;
}

export interface IBudget extends Document {
    budgetName: string;
    fiscalYear: Types.ObjectId;
    fiscalYearName: string;
    budgetLines: IBudgetLine[];
    totalBudgeted: number;
    status: BudgetStatus;
    approvedBy?: string;
    approvedAt?: Date;
    notes?: string;
    allowOverspend: boolean;       // If false, API blocks JE that causes overspend
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
}

const BudgetLineSchema = new Schema<IBudgetLine>({
    account: { type: Schema.Types.ObjectId, ref: 'ChartOfAccount', required: true },
    accountCode: { type: String, required: true },
    accountName: { type: String, required: true },
    budgetedAmount: { type: Number, required: true, min: 0 },
    q1Amount: { type: Number, default: 0 },
    q2Amount: { type: Number, default: 0 },
    q3Amount: { type: Number, default: 0 },
    q4Amount: { type: Number, default: 0 },
}, { _id: true });

const BudgetSchema = new Schema<IBudget>(
    {
        budgetName: { type: String, required: true, trim: true },
        fiscalYear: { type: Schema.Types.ObjectId, ref: 'FiscalYear', required: true },
        fiscalYearName: { type: String, required: true },
        budgetLines: { type: [BudgetLineSchema], default: [] },
        totalBudgeted: { type: Number, default: 0 },
        status: {
            type: String,
            enum: ['DRAFT', 'APPROVED', 'ACTIVE', 'CLOSED'],
            default: 'DRAFT',
        },
        approvedBy: { type: String },
        approvedAt: { type: Date },
        notes: { type: String },
        allowOverspend: { type: Boolean, default: false },
        createdBy: { type: String, required: true },
    },
    { timestamps: true }
);

BudgetSchema.index({ fiscalYear: 1 }, { unique: true });

const Budget =
    mongoose.models.Budget ||
    mongoose.model<IBudget>('Budget', BudgetSchema);

export default Budget;
