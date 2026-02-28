import mongoose, { Schema, Document, Types } from 'mongoose';

export type AuditAction =
    | 'CREATE' | 'UPDATE' | 'DELETE'
    | 'SUBMIT' | 'APPROVE' | 'REJECT' | 'POST'
    | 'LOCK_PERIOD' | 'CLOSE_FISCAL_YEAR'
    | 'PROCESS_PAYROLL' | 'RUN_DEPRECIATION'
    | 'PAYMENT_RECEIVED' | 'REFUND_ISSUED'
    | 'CANCEL'
    // ── Khatta v2 finance actions ──
    | 'FEE_PAYMENT_RECORDED'
    | 'EXPENSE_RECORDED'
    | 'PAYROLL_DISBURSED'
    | 'WALLET_TRANSFER'
    | 'SCHOLARSHIP_GRANTED'
    | 'PERIOD_LOCKED'
    | 'PERIOD_UNLOCKED'
    | 'INVESTMENT_CREATED'
    | 'INVESTMENT_RETURNED'
    | 'SECURITY_DEPOSIT_RECORDED'
    | `PERIOD_LOCKED`
    | `PERIOD_UNLOCKED`;

export interface IAuditLog extends Document {
    action: AuditAction;
    entityType: string;           // Model name, e.g. 'JournalEntry'
    entityId: Types.ObjectId | string;
    entityReference?: string;     // Human-readable ref e.g. 'JE-2025-00001'
    performedBy: string;          // userId
    performedByName?: string;
    performedAt: Date;
    previousState?: Record<string, unknown>;
    newState?: Record<string, unknown>;
    changedFields?: string[];
    ipAddress?: string;
    userAgent?: string;
    notes?: string;
}

const AuditLogSchema = new Schema<IAuditLog>(
    {
        action: {
            type: String,
            required: true,
            enum: [
                'CREATE', 'UPDATE', 'DELETE',
                'SUBMIT', 'APPROVE', 'REJECT', 'POST',
                'LOCK_PERIOD', 'CLOSE_FISCAL_YEAR',
                'PROCESS_PAYROLL', 'RUN_DEPRECIATION',
                'PAYMENT_RECEIVED', 'REFUND_ISSUED', 'CANCEL',
                // Khatta v2 finance actions
                'FEE_PAYMENT_RECORDED', 'EXPENSE_RECORDED',
                'PAYROLL_DISBURSED', 'WALLET_TRANSFER',
                'SCHOLARSHIP_GRANTED', 'PERIOD_LOCKED',
                'PERIOD_UNLOCKED', 'INVESTMENT_CREATED',
                'INVESTMENT_RETURNED', 'SECURITY_DEPOSIT_RECORDED'
            ],
        },
        entityType: { type: String, required: true },
        entityId: { type: Schema.Types.Mixed, required: true },
        entityReference: { type: String },
        performedBy: { type: String, required: true },
        performedByName: { type: String },
        performedAt: { type: Date, required: true, default: Date.now },
        previousState: { type: Schema.Types.Mixed },
        newState: { type: Schema.Types.Mixed },
        changedFields: [{ type: String }],
        ipAddress: { type: String },
        userAgent: { type: String },
        notes: { type: String },
    },
    {
        timestamps: false, // We manage performedAt manually for precision
        // No update or delete middleware — this collection is append-only
    }
);

// Immutability: block any update operations on audit logs
AuditLogSchema.pre('findOneAndUpdate', function () {
    throw new Error('IMMUTABILITY_VIOLATION: Audit logs cannot be modified.');
});
AuditLogSchema.pre('updateOne', function () {
    throw new Error('IMMUTABILITY_VIOLATION: Audit logs cannot be modified.');
});
AuditLogSchema.pre('updateMany', function () {
    throw new Error('IMMUTABILITY_VIOLATION: Audit logs cannot be modified.');
});

AuditLogSchema.index({ entityType: 1, entityId: 1 });
AuditLogSchema.index({ performedBy: 1 });
AuditLogSchema.index({ performedAt: -1 });
AuditLogSchema.index({ action: 1 });

const AuditLog =
    mongoose.models.AuditLog ||
    mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);

export default AuditLog;
