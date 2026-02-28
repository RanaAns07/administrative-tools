import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IAcademicSession extends Document {
    name: string; // e.g. "Fall 2025"
    startDate: Date;
    endDate: Date;
    isActive: boolean; // Indicates if the session is currently running
    createdAt: Date;
    updatedAt: Date;
}

const AcademicSessionSchema = new Schema<IAcademicSession>(
    {
        name: {
            type: String,
            required: [true, 'Session name is required.'],
            unique: true,
            trim: true,
        },
        startDate: {
            type: Date,
            required: [true, 'Start date is required.'],
        },
        endDate: {
            type: Date,
            required: [true, 'End date is required.'],
        },
        isActive: {
            type: Boolean,
            default: true,
        },
    },
    {
        timestamps: true,
        collection: 'university_academic_sessions',
    }
);

AcademicSessionSchema.index({ name: 1 }, { unique: true });
AcademicSessionSchema.index({ isActive: 1 });

const AcademicSession: Model<IAcademicSession> =
    mongoose.models.AcademicSession ||
    mongoose.model<IAcademicSession>('AcademicSession', AcademicSessionSchema);

export default AcademicSession;
