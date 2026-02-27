/**
 * @file Batch.ts
 * @description University Model — Program Batch
 *
 * A Batch is a specific intake of students into a program.
 * It is identified by the program, the admission year, and the season
 * (universities in Pakistan typically have Fall and Spring intakes).
 *
 * A Batch is the parent of:
 *   → StudentProfile (which students belong to this batch)
 *   → FeeStructure   (which fees apply to which semester of this batch)
 *
 * Examples:
 *   programId: <BSCS>, year: 2024, season: 'FALL'  → "BSCS Fall 2024"
 *   programId: <BBA>,  year: 2025, season: 'SPRING' → "BBA Spring 2025"
 */

import mongoose, { Schema, Document, Model, Types } from 'mongoose';

// ─── TypeScript Interface ─────────────────────────────────────────────────────

export type BatchSeason = 'FALL' | 'SPRING';

export interface IBatch extends Document {
    /** The academic program this batch belongs to */
    programId: Types.ObjectId;
    /** The year of admission e.g. 2024 */
    year: number;
    /** Which semester intake this batch was admitted in */
    season: BatchSeason;
    /**
     * When true, this batch is currently enrolled and can have fee structures
     * applied to it. New invoices cannot be issued for inactive batches.
     */
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

// ─── Schema ───────────────────────────────────────────────────────────────────

const BatchSchema = new Schema<IBatch>(
    {
        programId: {
            type: Schema.Types.ObjectId,
            ref: 'Program',
            required: [true, 'Program reference (programId) is required.'],
        },
        year: {
            type: Number,
            required: [true, 'Admission year is required.'],
            min: [2000, 'Year must be 2000 or later.'],
            max: [2100, 'Year must be 2100 or earlier.'],
        },
        season: {
            type: String,
            required: [true, 'Season (FALL or SPRING) is required.'],
            enum: {
                values: ['FALL', 'SPRING'],
                message: 'Season must be FALL or SPRING.',
            },
        },
        isActive: {
            type: Boolean,
            default: true,
        },
    },
    {
        timestamps: true,
        collection: 'university_batches',
    }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────

// A program can only have one batch per year+season combination
BatchSchema.index({ programId: 1, year: 1, season: 1 }, { unique: true });
BatchSchema.index({ isActive: 1 });
BatchSchema.index({ programId: 1 });

// ─── Model Export ─────────────────────────────────────────────────────────────

const Batch: Model<IBatch> =
    mongoose.models.Batch ||
    mongoose.model<IBatch>('Batch', BatchSchema);

export default Batch;
