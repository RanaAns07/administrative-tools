/**
 * @deprecated This endpoint has been retired as part of the Khatta Engine migration (2026-02-27).
 * The Chart of Accounts is a double-entry accounting concept replaced by Wallets and Categories.
 */
import { NextResponse } from 'next/server';

const GONE = {
    error: 'This endpoint has been retired.',
    detail: 'The Chart of Accounts has been replaced by the simpler Wallet and Category models.',
    replacements: {
        wallets: 'GET /api/finance/wallets — where money sits (BANK, CASH, INVESTMENT)',
        categories: 'GET /api/finance/categories — income/expense tags (e.g. "Tuition Fee", "Utility")',
    },
};

export async function GET() {
    return NextResponse.json(GONE, { status: 410 });
}
export async function POST() {
    return NextResponse.json(GONE, { status: 410 });
}
