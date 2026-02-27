/**
 * @deprecated This endpoint has been retired as part of the Khatta Engine migration (2026-02-27).
 * The Fiscal Year concept does not exist in the new cash-flow system.
 * Filter Transactions by date range instead: GET /api/finance/transactions?from=&to=
 */
import { NextResponse } from 'next/server';

const GONE = {
    error: 'This endpoint has been retired.',
    detail: 'Fiscal Years are not used in the Khatta (Wallet & Transaction) system.',
    replacement: 'Filter transactions by date: GET /api/finance/transactions?from=YYYY-MM-DD&to=YYYY-MM-DD',
};

export async function GET() {
    return NextResponse.json(GONE, { status: 410 });
}
export async function POST() {
    return NextResponse.json(GONE, { status: 410 });
}
