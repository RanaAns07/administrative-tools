/**
 * @file RecurringExpense.ts
 * @description Recurring Expense Template
 *
 * Defines a recurring monthly expense (e.g. electricity, internet, watchmen).
 * Each month a job calls the generation API which creates one ExpenseRecord per
 * active template.
 *
 * DEDUPLICATION:
 *   The generated ExpenseRecord has fields: recurringTemplateId, generatedForMonth,
 *   generatedForYear with a unique compound index → prevents double generation.
 */

import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface IRecurringExpense extends Document {
    title: string;
    categoryId: Types.ObjectId;
    amount: number;
    walletId: Types.ObjectId;
    vendorId?: Types.ObjectId;
    department?: string;
    dayOfMonth: number;             // 1–28: generate on this day
    isActive: boolean;
    lastGeneratedMonth?: number;
    lastGeneratedYear?: number;
    createdAt: Date;
    updatedAt: Date;
}

const RecurringExpenseSchema = new Schema<IRecurringExpense>(
    {
        title: {
            type: String,
            required: [true, 'Title is required.'],
            trim: true,
            maxlength: 300,
        },
        categoryId: {
            type: Schema.Types.ObjectId,
            ref: 'Category',
            required: [true, 'Category reference is required.'],
        },
        amount: {
            type: Number,
            required: [true, 'Amount is required.'],
            min: [0.01, 'Amount must be positive.'],
        },
        walletId: {
            type: Schema.Types.ObjectId,
            ref: 'Wallet',
            required: [true, 'Wallet reference is required.'],
        },
        vendorId: { type: Schema.Types.ObjectId, ref: 'Vendor' },
        department: { type: String, trim: true, maxlength: 100 },
        dayOfMonth: {
            type: Number,
            default: 1,
            min: [1, 'Day must be 1–28.'],
            max: [28, 'Day must be 1–28 to be safe across all months.'],
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        lastGeneratedMonth: { type: Number },
        lastGeneratedYear: { type: Number },
    },
    {
        timestamps: true,
        collection: 'finance_recurring_expenses',
    }
);

RecurringExpenseSchema.index({ isActive: 1 });
RecurringExpenseSchema.index({ categoryId: 1 });

const RecurringExpense: Model<IRecurringExpense> =
    mongoose.models.RecurringExpense ||
    mongoose.model<IRecurringExpense>('RecurringExpense', RecurringExpenseSchema);

export default RecurringExpense;
