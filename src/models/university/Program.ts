/**
 * @file Program.ts
 * @description University Model — Academic Program
 *
 * A Program is the top-level academic offering of the university.
 * Each program has a fixed number of semesters and a unique short code.
 *
 * Examples:
 *   name: 'BS Computer Science', code: 'BSCS', totalSemesters: 8
 *   name: 'BBA Finance',         code: 'BBAF', totalSemesters: 8
 *   name: 'MS Data Science',     code: 'MSDS', totalSemesters: 4
 */

import mongoose, { Schema, Document, Model } from 'mongoose';

// ─── TypeScript Interface ─────────────────────────────────────────────────────

export interface IProgram extends Document {
    /** Full program name shown in UI e.g. "BS Computer Science" */
    name: string;
    /** Short uppercase code e.g. "BSCS" — used in registration numbers */
    code: string;
    /** Total number of semesters to complete the program */
    totalSemesters: number;
    /** Soft-delete flag — inactive programs cannot accept new batches */
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

// ─── Schema ───────────────────────────────────────────────────────────────────

const ProgramSchema = new Schema<IProgram>(
    {
        name: {
            type: String,
            required: [true, 'Program name is required.'],
            unique: true,
            trim: true,
            maxlength: [200, 'Program name must not exceed 200 characters.'],
        },
        code: {
            type: String,
            required: [true, 'Program code is required.'],
            unique: true,
            trim: true,
            uppercase: true,
            maxlength: [20, 'Program code must not exceed 20 characters.'],
        },
        totalSemesters: {
            type: Number,
            required: [true, 'Total semesters is required.'],
            default: 8,
            min: [1, 'Program must have at least 1 semester.'],
            max: [12, 'Program cannot have more than 12 semesters.'],
        },
        isActive: {
            type: Boolean,
            default: true,
        },
    },
    {
        timestamps: true,
        collection: 'university_programs',
    }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────

ProgramSchema.index({ code: 1 }, { unique: true });
ProgramSchema.index({ isActive: 1 });

// ─── Model Export ─────────────────────────────────────────────────────────────

const Program: Model<IProgram> =
    mongoose.models.Program ||
    mongoose.model<IProgram>('Program', ProgramSchema);

export default Program;
