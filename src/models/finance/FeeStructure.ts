/**
 * @file FeeStructure.ts
 * @description Khatta Fee Engine — Fee Structure (Semester Fee Template)
 *
 * A FeeStructure is the master template that defines WHAT fees are charged
 * for a specific semester of a specific batch. Think of it as the "price list"
 * for one semester.
 *
 * When the finance office is ready to generate fee challans, they:
 *   1. Pick the FeeStructure for this batch + semester.
 *   2. The system bulk-creates a FeeInvoice per student in that batch.
 *
 * This model deliberately avoids any Chart of Account references.
 * Revenue categorisation is handled at the Transaction level via Category.
 *
 * Example:
 *   batchId: <BSCS Fall 2024>
 *   semesterNumber: 3
 *   feeHeads: [
 *     { name: 'Tuition Fee', amount: 50000 },
 *     { name: 'Lab Charges', amount: 7500 },
 *     { name: 'Library Fee', amount: 2500 },
 *   ]
 *   totalAmount: 60000   ← auto-computed by pre-save hook
 */

import mongoose, { Schema, Document, Model, Types } from 'mongoose';

// ─── TypeScript Interfaces ────────────────────────────────────────────────────

/** A single line item within a fee structure (e.g. Tuition, Lab, Library) */
export interface IFeeHead {
    /** Human-readable name shown on the student challan */
    name: string;
    /** Amount in PKR (or the wallet's base currency) */
    amount: number;
    /** If false the student can opt out (e.g. hostel fee) */
    isOptional: boolean;
}

export interface IFeeStructure extends Document {
    /** The batch this fee structure applies to */
    batchId: Types.ObjectId;
    /** Which semester number (1-based) these fees are for */
    semesterNumber: number;
    /** Individual line items that make up the total fee */
    feeHeads: IFeeHead[];
    /**
     * The sum of all feeHeads[].amount.
     * Auto-computed by the pre-save hook — do NOT set manually.
     */
    totalAmount: number;
    /** Penalty charged per day after the due date */
    lateFeePerDay: number;
    /** Number of grace days before late fees begin */
    gracePeriodDays: number;
    /**
     * Controls whether this structure is the one currently used for
     * new invoice generation. Only one FeeStructure per batch+semester
     * should be active at a time.
     */
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

// ─── Sub-Schemas ──────────────────────────────────────────────────────────────

const FeeHeadSchema = new Schema<IFeeHead>(
    {
        name: {
            type: String,
            required: [true, 'Fee head name is required.'],
            trim: true,
            maxlength: [150, 'Fee head name must not exceed 150 characters.'],
        },
        amount: {
            type: Number,
            required: [true, 'Fee head amount is required.'],
            min: [0, 'Fee head amount cannot be negative.'],
        },
        isOptional: {
            type: Boolean,
            default: false,
        },
    },
    { _id: true }
);

// ─── Main Schema ──────────────────────────────────────────────────────────────

const FeeStructureSchema = new Schema<IFeeStructure>(
    {
        batchId: {
            type: Schema.Types.ObjectId,
            ref: 'Batch',
            required: [true, 'Batch reference (batchId) is required.'],
        },
        semesterNumber: {
            type: Number,
            required: [true, 'Semester number is required.'],
            min: [1, 'Semester number must be at least 1.'],
        },
        feeHeads: {
            type: [FeeHeadSchema],
            required: [true, 'At least one fee head is required.'],
            validate: {
                validator: (arr: IFeeHead[]) => arr.length > 0,
                message: 'feeHeads array must not be empty.',
            },
        },
        totalAmount: {
            type: Number,
            default: 0,
            min: [0, 'Total amount cannot be negative.'],
        },
        lateFeePerDay: {
            type: Number,
            default: 0,
            min: [0, 'Late fee per day cannot be negative.'],
        },
        gracePeriodDays: {
            type: Number,
            default: 7,
            min: [0, 'Grace period cannot be negative.'],
        },
        isActive: {
            type: Boolean,
            default: true,
        },
    },
    {
        timestamps: true,
        collection: 'finance_fee_structures',
    }
);

// ─── Pre-Save Hook ────────────────────────────────────────────────────────────

/**
 * Auto-compute totalAmount as the sum of all mandatory + optional feeHeads.
 * This keeps the field in sync whenever feeHeads are changed.
 */
FeeStructureSchema.pre('save', function () {
    this.totalAmount = this.feeHeads.reduce(
        (sum, head) => sum + (head.amount || 0),
        0
    );
});

// ─── Indexes ──────────────────────────────────────────────────────────────────

// A batch can have only one active fee structure per semester
FeeStructureSchema.index({ batchId: 1, semesterNumber: 1 });
FeeStructureSchema.index({ isActive: 1 });

// ─── Model Export ─────────────────────────────────────────────────────────────

// IMPORTANT: We use 'FeeStructureV2' as the Mongoose model name to avoid
// a collision with the old accounting FeeStructure model that may still be
// registered in the Node.js module cache on the same server instance.
const FeeStructure: Model<IFeeStructure> =
    (mongoose.models.FeeStructureV2 as Model<IFeeStructure>) ||
    mongoose.model<IFeeStructure>('FeeStructureV2', FeeStructureSchema);

export default FeeStructure;
