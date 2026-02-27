/**
 * @file StudentProfile.ts
 * @description University Model — Student Academic Profile
 *
 * A StudentProfile represents a student's academic enrollment record.
 * It links to the system User account (for login/authentication) and to
 * the Batch they were admitted into.
 *
 * This is the FK target for FeeInvoice — every challan is issued to a
 * StudentProfile, not a raw User ID, keeping the finance module decoupled
 * from the authentication module.
 *
 * Registration Number format (convention):
 *   <Season Abbr><Year>-<Program Code>-<Sequence>
 *   e.g.  FA24-BSCS-001  → Fall 2024, BS Computer Science, student #1
 *         SP25-BBA-012   → Spring 2025, BBA, student #12
 */

import mongoose, { Schema, Document, Model, Types } from 'mongoose';

// ─── TypeScript Interface ─────────────────────────────────────────────────────

export type StudentStatus = 'ACTIVE' | 'DROPOUT' | 'GRADUATED' | 'SUSPENDED';

export interface IStudentProfile extends Document {
    /**
     * Reference to the User account for this student.
     * May be null if the student has not yet been given portal access.
     */
    userId?: Types.ObjectId;

    /** University-issued registration number — globally unique */
    registrationNumber: string;

    /**
     * The batch (program + year + season) the student was admitted into.
     * This is the primary link to the programme hierarchy.
     */
    batchId: Types.ObjectId;

    /**
     * The student's current semester number (1-based).
     * Advances each semester; never exceeds Program.totalSemesters.
     */
    currentSemester: number;

    /** Current enrollment status */
    status: StudentStatus;

    // ── Denormalised contact fields ──────────────────────────────────────────
    // Stored here so invoice generation doesn't need a User join.
    /** Full name as shown on the challan */
    name: string;
    /** Contact email for fee reminders */
    email: string;
    /** Phone number */
    phone?: string;

    createdAt: Date;
    updatedAt: Date;
}

// ─── Schema ───────────────────────────────────────────────────────────────────

const StudentProfileSchema = new Schema<IStudentProfile>(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            default: null,
            // Optional: some students may be enrolled before portal access is granted.
        },
        registrationNumber: {
            type: String,
            required: [true, 'Registration number is required.'],
            unique: true,
            trim: true,
            uppercase: true,
            maxlength: [30, 'Registration number must not exceed 30 characters.'],
        },
        batchId: {
            type: Schema.Types.ObjectId,
            ref: 'Batch',
            required: [true, 'Batch reference (batchId) is required.'],
        },
        currentSemester: {
            type: Number,
            default: 1,
            min: [1, 'Semester number must be at least 1.'],
        },
        status: {
            type: String,
            required: true,
            enum: {
                values: ['ACTIVE', 'DROPOUT', 'GRADUATED', 'SUSPENDED'],
                message: 'Status must be ACTIVE, DROPOUT, GRADUATED, or SUSPENDED.',
            },
            default: 'ACTIVE',
        },
        name: {
            type: String,
            required: [true, 'Student name is required.'],
            trim: true,
            maxlength: [200, 'Name must not exceed 200 characters.'],
        },
        email: {
            type: String,
            required: [true, 'Student email is required.'],
            trim: true,
            lowercase: true,
        },
        phone: {
            type: String,
            trim: true,
        },
    },
    {
        timestamps: true,
        collection: 'university_students',
    }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────

StudentProfileSchema.index({ registrationNumber: 1 }, { unique: true });
StudentProfileSchema.index({ batchId: 1 });
StudentProfileSchema.index({ status: 1 });
StudentProfileSchema.index({ userId: 1 });
// Fast lookup for fee officers searching by name or email
StudentProfileSchema.index({ name: 1 });
StudentProfileSchema.index({ email: 1 });

// ─── Model Export ─────────────────────────────────────────────────────────────

const StudentProfile: Model<IStudentProfile> =
    mongoose.models.StudentProfile ||
    mongoose.model<IStudentProfile>('StudentProfile', StudentProfileSchema);

export default StudentProfile;
