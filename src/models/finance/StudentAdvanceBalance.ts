/**
 * @file StudentAdvanceBalance.ts
 * @description Student Advance / Overpayment Balance
 *
 * When a student pays MORE than their invoice amount, the excess is NOT
 * stored on the invoice. It is credited here as an advance balance.
 *
 * The FinanceTransactionService automatically checks this balance when
 * generating/paying a new invoice and applies it first.
 *
 * Balance is NEVER adjusted manually via API — only through the service.
 */

import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface IStudentAdvanceBalance extends Document {
    studentProfileId: Types.ObjectId;
    balance: number;       // Always >= 0. Never goes negative.
    lastUpdated: Date;
    createdAt: Date;
    updatedAt: Date;
}

const StudentAdvanceBalanceSchema = new Schema<IStudentAdvanceBalance>(
    {
        studentProfileId: {
            type: Schema.Types.ObjectId,
            ref: 'StudentProfile',
            required: true,
            unique: true,    // One record per student
        },
        balance: {
            type: Number,
            default: 0,
            min: [0, 'Advance balance cannot be negative.'],
        },
        lastUpdated: {
            type: Date,
            default: Date.now,
        },
    },
    {
        timestamps: true,
        collection: 'finance_student_advance_balances',
        optimisticConcurrency: true,
    }
);

StudentAdvanceBalanceSchema.index({ studentProfileId: 1 }, { unique: true });

const StudentAdvanceBalance: Model<IStudentAdvanceBalance> =
    mongoose.models.StudentAdvanceBalance ||
    mongoose.model<IStudentAdvanceBalance>('StudentAdvanceBalance', StudentAdvanceBalanceSchema);

export default StudentAdvanceBalance;
