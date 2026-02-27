/**
 * @deprecated This endpoint has been retired as part of the Khatta Engine migration (2026-02-27).
 * Accounting Periods (monthly locks) are a double-entry accounting concept.
 * The Khatta system does not lock periods — transactions are immutable records.
 */
import { NextResponse } from 'next/server';

const GONE = {
    error: 'This endpoint has been retired.',
    detail: 'Accounting Periods are a double-entry accounting concept not used in the Khatta system.',
    replacement: 'Query transactions by date range: GET /api/finance/transactions?from=YYYY-MM-DD&to=YYYY-MM-DD',
};

export async function GET() {
    return NextResponse.json(GONE, { status: 410 });
}
export async function PATCH() {
    return NextResponse.json(GONE, { status: 410 });
}
