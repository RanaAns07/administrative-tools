/**
 * @deprecated This endpoint has been retired as part of the Khatta Engine migration (2026-02-27).
 * The Balance Sheet is a double-entry accounting report.
 * The Khatta equivalent is: query Wallet balances grouped by type.
 */
import { NextResponse } from 'next/server';

const GONE = {
    error: 'This endpoint has been retired.',
    detail: 'The Balance Sheet report relied on Journal Entries and Chart of Accounts, which are no longer used.',
    replacement: 'GET /api/finance/wallets — returns currentBalance per wallet (BANK, CASH, INVESTMENT)',
};

export async function GET() {
    return NextResponse.json(GONE, { status: 410 });
}
