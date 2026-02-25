/**
 * Finance Utilities
 * Shared helpers: auto-number generation, audit logging, period validation
 */

import dbConnect from '@/lib/mongodb';
import AuditLog, { AuditAction } from '@/models/finance/AuditLog';
import AccountingPeriod from '@/models/finance/AccountingPeriod';
import JournalEntry from '@/models/finance/JournalEntry';

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

export async function generateJENumber(): Promise<string> {
    return getNextSequence(JournalEntry as any, 'entryNumber', 'JE');
}

export async function generateReceiptNumber(): Promise<string> {
    const { default: FeePayment } = await import('@/models/finance/FeePayment');
    return getNextSequence(FeePayment as any, 'receiptNumber', 'RCP');
}

export async function generateInvoiceNumber(): Promise<string> {
    const { default: FeeInvoice } = await import('@/models/finance/FeeInvoice');
    return getNextSequence(FeeInvoice as any, 'invoiceNumber', 'INV');
}

export async function generateVendorInvoiceRef(): Promise<string> {
    const { default: VendorInvoice } = await import('@/models/finance/VendorInvoice');
    return getNextSequence(VendorInvoice as any, 'internalReference', 'VIN');
}

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

// ─── Period Lock Validator ────────────────────────────────────────────────────

export async function validatePeriodNotLocked(entryDate: Date): Promise<{ locked: boolean; message?: string }> {
    await dbConnect();
    const d = new Date(entryDate);

    const period = await AccountingPeriod.findOne({
        startDate: { $lte: d },
        endDate: { $gte: d },
    }).lean();

    if (!period) return { locked: false }; // No period defined = allow
    if (period.isLocked) {
        return {
            locked: true,
            message: `Accounting period "${period.periodName}" is locked and cannot accept new entries.`,
        };
    }
    return { locked: false };
}

// ─── Double-Entry Validator ───────────────────────────────────────────────────

export function validateDoubleEntry(lines: { debit: number; credit: number }[]): {
    valid: boolean;
    totalDebit: number;
    totalCredit: number;
    message?: string;
} {
    const totalDebit = lines.reduce((sum, l) => sum + (l.debit || 0), 0);
    const totalCredit = lines.reduce((sum, l) => sum + (l.credit || 0), 0);

    // Use toFixed(2) to handle floating point
    const debitRounded = parseFloat(totalDebit.toFixed(2));
    const creditRounded = parseFloat(totalCredit.toFixed(2));

    if (debitRounded !== creditRounded) {
        return {
            valid: false,
            totalDebit: debitRounded,
            totalCredit: creditRounded,
            message: `Debits (${debitRounded.toLocaleString()}) must equal Credits (${creditRounded.toLocaleString()}). Difference: ${Math.abs(debitRounded - creditRounded).toLocaleString()}`,
        };
    }
    if (debitRounded === 0) {
        return { valid: false, totalDebit: 0, totalCredit: 0, message: 'Journal entry cannot have zero totals.' };
    }
    return { valid: true, totalDebit: debitRounded, totalCredit: creditRounded };
}

// ─── Budget Overspend Check ───────────────────────────────────────────────────

export async function checkBudgetOverspend(
    accountCode: string,
    additionalAmount: number,
    fiscalYearId: string
): Promise<{ overspend: boolean; budgeted: number; utilized: number; message?: string }> {
    const { default: Budget } = await import('@/models/finance/Budget');
    await dbConnect();

    const budget = await Budget.findOne({ fiscalYear: fiscalYearId, status: 'ACTIVE' }).lean();
    if (!budget) return { overspend: false, budgeted: 0, utilized: 0 };

    const line = budget.budgetLines.find((l: any) => l.accountCode === accountCode);
    if (!line) return { overspend: false, budgeted: 0, utilized: 0 };

    // Sum posted JE lines for this account in the fiscal year
    const JE = await import('@/models/finance/JournalEntry');
    const posted = await JE.default.aggregate([
        { $match: { status: 'POSTED', fiscalYear: fiscalYearId } },
        { $unwind: '$lines' },
        { $match: { 'lines.accountCode': accountCode } },
        { $group: { _id: null, total: { $sum: '$lines.debit' } } }
    ]);

    const utilized = posted[0]?.total || 0;
    const budgeted = line.budgetedAmount;
    const overspend = (utilized + additionalAmount) > budgeted && !budget.allowOverspend;

    return {
        overspend,
        budgeted,
        utilized,
        message: overspend
            ? `Budget overspend: Account ${accountCode} has PKR ${budgeted.toLocaleString()} budgeted, PKR ${utilized.toLocaleString()} utilized. Adding PKR ${additionalAmount.toLocaleString()} exceeds budget.`
            : undefined,
    };
}
