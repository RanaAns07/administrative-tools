/**
 * @deprecated This endpoint has been retired as part of the Khatta Engine migration (2026-02-27).
 * Journal Entry approvals are a double-entry accounting concept.
 * Transactions in the new system are recorded directly — no approval workflow.
 */
import { NextResponse } from 'next/server';

const GONE = {
    error: 'This endpoint has been retired.',
    detail: 'Journal Entry approvals do not exist in the Khatta system. Transactions are posted directly.',
    replacement: 'GET /api/finance/transactions — view all recorded transactions',
};

export async function GET() {
    return NextResponse.json(GONE, { status: 410 });
}
export async function PATCH() {
    return NextResponse.json(GONE, { status: 410 });
}
