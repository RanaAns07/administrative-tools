/**
 * @deprecated This endpoint has been retired as part of the Khatta Engine migration (2026-02-27).
 */
import { NextResponse } from 'next/server';

const GONE = {
    error: 'This endpoint has been retired.',
    detail: 'Fiscal Years and Accounting Periods are not used in the Khatta system.',
    replacement: 'N/A — use date-range filters on /api/finance/transactions',
};

export async function POST() {
    return NextResponse.json(GONE, { status: 410 });
}
