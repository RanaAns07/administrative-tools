/**
 * @file FeeInvoice.ts
 * @description Khatta Fee Engine — Fee Invoice (Student Challan)
 *
 * A FeeInvoice is the actual fee challan issued to one student for one
 * semester. It is generated from a FeeStructure template and tracks
 * how much has been paid.
 *
 * PAYMENT FLOW (Khatta integration):
 *   FeeInvoice.amountPaid    ← updated by the fee-collection API
 *   Transaction (type: IN)   ← created by the fee-collection API
 *   Wallet.currentBalance    ← auto-updated by Transaction.pre('save')
 *
 * Do NOT touch Wallet.currentBalance directly; it is managed exclusively
 * by the Transaction pre-save hook.
 *
 * STATUS TRANSITIONS:
 *   PENDING  →  PARTIAL  →  PAID
 *   PENDING  →  OVERDUE          (when due date passes, no payment)
 *   Any      →  WAIVED           (admin writes off outstanding amount)
 */

import mongoose, { Schema, Document, Model, Types } from 'mongoose';

// ─── TypeScript Interface ─────────────────────────────────────────────────────

export type FeeInvoiceStatus = 'PENDING' | 'PARTIAL' | 'PAID' | 'OVERDUE' | 'WAIVED';

export interface IFeeInvoice extends Document {
    /** The student this challan was issued to */
    studentProfileId: Types.ObjectId;
    /** The fee structure template this invoice was generated from */
    feeStructureId: Types.ObjectId;
    /** Which semester number this challan is for (denormalised for fast querying) */
    semesterNumber: number;
    /** Date the challan was generated / issued */
    issueDate: Date;
    /** Last date for payment without late fees */
    dueDate: Date;
    /** Original fee amount from the FeeStructure (copied at invoice time) */
    totalAmount: number;
    /** Scholarship or discount applied — reduces effective payable amount */
    discountAmount: number;
    /** Accumulated late fee penalty (added when payment is made after dueDate) */
    penaltyAmount: number;
    /** Total received so far via fee-collection API */
    amountPaid: number;
    /** Invoice lifecycle status */
    status: FeeInvoiceStatus;
    /** Optional admin note (e.g. "Fee waived — scholarship approved") */
    notes?: string;
    /** Virtual: amount still outstanding */
    readonly arrears: number;
    createdAt: Date;
    updatedAt: Date;
}

// ─── Schema ───────────────────────────────────────────────────────────────────

const FeeInvoiceSchema = new Schema<IFeeInvoice>(
    {
        studentProfileId: {
            type: Schema.Types.ObjectId,
            ref: 'StudentProfile',
            required: [true, 'Student profile reference (studentProfileId) is required.'],
        },
        feeStructureId: {
            type: Schema.Types.ObjectId,
            ref: 'FeeStructureV2',
            required: [true, 'Fee structure reference (feeStructureId) is required.'],
        },
        semesterNumber: {
            type: Number,
            required: [true, 'Semester number is required.'],
            min: [1, 'Semester number must be at least 1.'],
        },
        issueDate: {
            type: Date,
            default: Date.now,
        },
        dueDate: {
            type: Date,
            required: [true, 'Due date is required.'],
        },
        totalAmount: {
            type: Number,
            required: [true, 'Total amount is required.'],
            min: [0, 'Total amount cannot be negative.'],
        },
        discountAmount: {
            type: Number,
            default: 0,
            min: [0, 'Discount amount cannot be negative.'],
        },
        penaltyAmount: {
            type: Number,
            default: 0,
            min: [0, 'Penalty amount cannot be negative.'],
        },
        amountPaid: {
            type: Number,
            default: 0,
            min: [0, 'Amount paid cannot be negative.'],
        },
        status: {
            type: String,
            required: true,
            enum: {
                values: ['PENDING', 'PARTIAL', 'PAID', 'OVERDUE', 'WAIVED'],
                message: 'Status must be PENDING, PARTIAL, PAID, OVERDUE, or WAIVED.',
            },
            default: 'PENDING',
        },
        notes: {
            type: String,
            trim: true,
            maxlength: [1000, 'Notes must not exceed 1000 characters.'],
        },
    },
    {
        timestamps: true,
        collection: 'finance_fee_invoices',
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

// ─── Virtuals ─────────────────────────────────────────────────────────────────

/**
 * arrears — the amount the student still owes.
 *
 * Formula: (totalAmount - discountAmount + penaltyAmount) - amountPaid
 * Clamped to 0 so it never goes negative (overpayments show as 0 here).
 */
FeeInvoiceSchema.virtual('arrears').get(function (this: IFeeInvoice) {
    const payable = this.totalAmount - this.discountAmount + this.penaltyAmount;
    return Math.max(0, payable - this.amountPaid);
});

// ─── Pre-Save Hook ────────────────────────────────────────────────────────────

/**
 * Auto-transition status based on payment state.
 * The fee-collection API should NEVER set status manually —
 * simply update amountPaid and let this hook handle the rest.
 */
FeeInvoiceSchema.pre('save', function () {
    // Never override a manually-set terminal state
    if (this.status === 'WAIVED') return;

    const effectiveTotal = this.totalAmount - this.discountAmount;

    if (this.amountPaid >= effectiveTotal) {
        this.status = 'PAID';
    } else if (this.amountPaid > 0) {
        this.status = 'PARTIAL';
    } else if (new Date() > this.dueDate) {
        this.status = 'OVERDUE';
    } else {
        this.status = 'PENDING';
    }
});

// ─── Indexes ──────────────────────────────────────────────────────────────────

// Most common query: all invoices for a student
FeeInvoiceSchema.index({ studentProfileId: 1 });
// Finance dashboard: group by status
FeeInvoiceSchema.index({ status: 1 });
// Overdue alerts: find all past-due, unpaid invoices
FeeInvoiceSchema.index({ dueDate: 1, status: 1 });
// Batch-level fee reports
FeeInvoiceSchema.index({ feeStructureId: 1 });
// Semester filter
FeeInvoiceSchema.index({ semesterNumber: 1 });

// ─── Model Export ─────────────────────────────────────────────────────────────

// Using 'FeeInvoiceV2' to avoid cache collision with the old accounting model.
const FeeInvoice: Model<IFeeInvoice> =
    (mongoose.models.FeeInvoiceV2 as Model<IFeeInvoice>) ||
    mongoose.model<IFeeInvoice>('FeeInvoiceV2', FeeInvoiceSchema);

export default FeeInvoice;
