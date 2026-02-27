/**
 * @deprecated This endpoint has been retired as part of the Khatta Engine migration (2026-02-27).
 * The Fiscal Year / Period management concept does not exist in the new cash-flow system.
 */
import { NextResponse } from 'next/server';

const GONE = {
    error: 'This endpoint has been retired.',
    detail: 'Fiscal Years are not used in the Khatta system.',
    replacement: 'N/A — use date-range filters on /api/finance/transactions',
};

export async function GET() {
    return NextResponse.json(GONE, { status: 410 });
}
export async function PATCH() {
    return NextResponse.json(GONE, { status: 410 });
}
