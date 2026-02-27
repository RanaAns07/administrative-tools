/**
 * @deprecated This endpoint has been retired as part of the Khatta Engine migration (2026-02-27).
 * The General Ledger is a double-entry accounting concept. The equivalent in the new
 * system is querying all Transactions for a given Wallet.
 */
import { NextResponse } from 'next/server';

const GONE = {
    error: 'This endpoint has been retired.',
    detail: 'The General Ledger concept does not exist in the Khatta system.',
    replacement: 'GET /api/finance/transactions?walletId=<id> — all movements for a wallet',
};

export async function GET() {
    return NextResponse.json(GONE, { status: 410 });
}
