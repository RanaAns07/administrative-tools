/**
 * Finance Utilities
 * Shared helpers: auto-number generation, audit logging
 *
 * NOTE (2026-02-27): The following functions were removed during the Khatta migration:
 *   - generateJENumber()          — Journal Entries replaced by Transactions
 *   - validatePeriodNotLocked()   — Accounting Periods deprecated
 *   - validateDoubleEntry()       — No double-entry in Khatta system
 *   - checkBudgetOverspend()      — Budget module decoupled; no JE dependency
 */

import dbConnect from '@/lib/mongodb';
import AuditLog, { AuditAction } from '@/models/finance/AuditLog';

// ─── Sequential Number Generator ────────────────────────────────────────────

type NumberedDoc = { entryNumber?: string; invoiceNumber?: string; receiptNumber?: string;[key: string]: unknown };

async function getNextSequence(
    model: { find: (q: object, p: object, o: object) => { lean: () => Promise<NumberedDoc[]> } },
    field: string,
    prefix: string
): Promise<string> {
    const year = new Date().getFullYear();
    const docs = await model.find(
        { [field]: new RegExp(`^${prefix}-${year}-`) },
        { [field]: 1 },
        { sort: { [field]: -1 }, limit: 1 }
    ).lean();

    if (docs.length === 0) {
        return `${prefix}-${year}-00001`;
    }

    const lastNum = docs[0][field] as string;
    const seq = parseInt(lastNum.split('-').pop() || '0', 10);
    return `${prefix}-${year}-${String(seq + 1).padStart(5, '0')}`;
}

export async function generateReceiptNumber(): Promise<string> {
    const { default: FeePayment } = await import('@/models/finance/FeePayment');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return getNextSequence(FeePayment as any, 'receiptNumber', 'RCP');
}

export async function generateInvoiceNumber(): Promise<string> {
    const { default: FeeInvoice } = await import('@/models/finance/FeeInvoice');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return getNextSequence(FeeInvoice as any, 'invoiceNumber', 'INV');
}

export async function generateVendorInvoiceRef(): Promise<string> {
    const { default: VendorInvoice } = await import('@/models/finance/VendorInvoice');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return getNextSequence(VendorInvoice as any, 'internalReference', 'VIN');
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function generateSequenceNumber(prefix: string, model: any, field: string): Promise<string> {
    return getNextSequence(model, field, prefix);
}

// ─── Audit Logger ────────────────────────────────────────────────────────────

export async function writeAuditLog(params: {
    action: AuditAction;
    entityType: string;
    entityId: string;
    entityReference?: string;
    performedBy: string;
    performedByName?: string;
    previousState?: object;
    newState?: object;
    changedFields?: string[];
    notes?: string;
}) {
    await dbConnect();
    await AuditLog.create({
        ...params,
        performedAt: new Date(),
    });
}
