/**
 * @deprecated This endpoint has been retired as part of the Khatta Engine migration (2026-02-27).
 */
import { NextResponse } from 'next/server';

const GONE = {
    error: 'This endpoint has been retired.',
    detail: 'Journal Entries (double-entry) have been replaced by the simpler Transaction model.',
    replacement: 'GET /api/finance/transactions/:id — retrieve a specific transaction',
};

export async function GET() {
    return NextResponse.json(GONE, { status: 410 });
}
export async function PATCH() {
    return NextResponse.json(GONE, { status: 410 });
}
