/**
 * @file Category.ts
 * @description Khatta Engine — Category Model
 *
 * Categories are used to tag every income or expense transaction.
 * They replace the old Chart of Accounts concept with plain-language labels
 * that front-desk staff can understand immediately.
 *
 * Examples:
 *   INCOME  → 'Tuition Fee', 'Admission Fee', 'Library Fine'
 *   EXPENSE → 'Utility Bill', 'Faculty Salary', 'Office Supplies'
 */

import mongoose, { Schema, Document, Model } from 'mongoose';

// ─── TypeScript Interfaces ────────────────────────────────────────────────────

/** The two kinds of money categories */
export type CategoryType = 'INCOME' | 'EXPENSE';

/** Shape of a Category document returned from MongoDB */
export interface ICategory extends Document {
    /** Human-readable label shown in dropdowns (e.g. "Tuition Fee") */
    name: string;
    /** Whether this category represents money coming in or going out */
    type: CategoryType;
    /** Optional longer explanation for admin reference */
    description?: string;
    /** Soft-delete flag — inactive categories are hidden from new entries */
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

// ─── Schema ───────────────────────────────────────────────────────────────────

const CategorySchema = new Schema<ICategory>(
    {
        name: {
            type: String,
            required: [true, 'Category name is required.'],
            trim: true,
            maxlength: [100, 'Category name must not exceed 100 characters.'],
        },
        type: {
            type: String,
            required: [true, 'Category type (INCOME or EXPENSE) is required.'],
            enum: {
                values: ['INCOME', 'EXPENSE'],
                message: 'Type must be either INCOME or EXPENSE.',
            },
        },
        description: {
            type: String,
            trim: true,
            maxlength: [500, 'Description must not exceed 500 characters.'],
        },
        isActive: {
            type: Boolean,
            default: true,
        },
    },
    {
        timestamps: true, // auto-manages createdAt & updatedAt
        collection: 'finance_categories', // explicit collection name to avoid collisions
    }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────

// Quickly fetch all INCOME or all EXPENSE categories for dropdowns
CategorySchema.index({ type: 1 });
// Support fast name searches in the UI
CategorySchema.index({ name: 1 });
// Common query pattern: only show active categories
CategorySchema.index({ isActive: 1, type: 1 });

// ─── Model Export ─────────────────────────────────────────────────────────────

// Next.js hot-reload guard: prevent "Cannot overwrite model" error in dev
const Category: Model<ICategory> =
    mongoose.models.Category ||
    mongoose.model<ICategory>('Category', CategorySchema);

export default Category;
