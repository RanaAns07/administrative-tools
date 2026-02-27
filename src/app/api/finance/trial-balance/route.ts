/**
 * @deprecated This endpoint has been retired as part of the Khatta Engine migration (2026-02-27).
 * The Trial Balance is a double-entry accounting concept (debits must equal credits).
 * The Khatta system has no debits/credits — use Wallet balances for a balance summary.
 */
import { NextResponse } from 'next/server';

const GONE = {
    error: 'This endpoint has been retired.',
    detail: 'Trial Balance is a double-entry concept. The Khatta system has no debits or credits.',
    replacement: 'GET /api/finance/wallets — returns currentBalance for each wallet (BANK, CASH, INVESTMENT)',
};

export async function GET() {
    return NextResponse.json(GONE, { status: 410 });
}
