/**
 * @deprecated This endpoint has been retired as part of the Khatta Engine migration (2026-02-27).
 * The Income Statement report was built on top of Journal Entries and Chart of Accounts,
 * neither of which exist in the new system.
 *
 * REPLACEMENT:
 *   Query Transactions by category type to produce an income/expense summary:
 *   GET /api/finance/transactions?type=IN   → Income
 *   GET /api/finance/transactions?type=OUT  → Expenses
 *   Group by categoryId for a breakdown.
 */
import { NextResponse } from 'next/server';

const GONE = {
    error: 'This endpoint has been retired.',
    detail: 'The Income Statement report relied on Journal Entries and Chart of Accounts, which are no longer used.',
    replacement: {
        income: 'GET /api/finance/transactions?type=IN — all income transactions, grouped by categoryId',
        expenses: 'GET /api/finance/transactions?type=OUT — all expense transactions, grouped by categoryId',
    },
};

export async function GET() {
    return NextResponse.json(GONE, { status: 410 });
}
