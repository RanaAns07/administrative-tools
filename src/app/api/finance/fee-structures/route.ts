/* eslint-disable @typescript-eslint/no-explicit-any */
export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import dbConnect from '@/lib/mongodb';
import { withErrorHandler } from '@/lib/api-utils';
import FeeStructure from '@/models/finance/FeeStructure';
import { writeAuditLog } from '@/lib/finance-utils';

import '@/models/university/Batch'; // Ensure Batch is registered before populate
import '@/models/university/Program'; // Ensure Program is registered before populate

/**
 * GET /api/finance/fee-structures
 * List active fee structures.
 * Query params: batchId, semesterNumber
 */
export const GET = withErrorHandler(async (req: Request) => {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const batchId = searchParams.get('batchId');
    const semesterNumber = searchParams.get('semesterNumber');
    const query: Record<string, unknown> = { isActive: true };
    if (batchId) query.batchId = batchId;
    if (semesterNumber) query.semesterNumber = parseInt(semesterNumber, 10);

    console.log('DEBUG: GET /api/finance/fee-structures', { query });

    const structures = await FeeStructure.find(query)
        .populate({ path: 'batchId', select: 'year season programId', populate: { path: 'programId', select: 'name code' } })
        .sort({ createdAt: -1 })
        .lean();

    console.log(`DEBUG: Found ${structures.length} structures`);

    return NextResponse.json(structures);
});

/**
 * POST /api/finance/fee-structures
 * Create a new fee structure for a batch/semester.
 *
 * Body: { batchId, semesterNumber, feeHeads: [{name, amount, isOptional?}], lateFeePerDay?, gracePeriodDays? }
 * totalAmount is auto-computed by the FeeStructure pre-save hook.
 */
export const POST = withErrorHandler(async (req: Request) => {
    const session = await getServerSession();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await dbConnect();
    const body = await req.json();
    const { batchId, semesterNumber, feeHeads, lateFeePerDay, gracePeriodDays } = body;

    console.log('DEBUG: POST /api/finance/fee-structures', { batchId, semesterNumber });

    if (!batchId || !semesterNumber || !feeHeads?.length) {
        return NextResponse.json(
            { error: 'batchId, semesterNumber, and feeHeads (non-empty array) are required.' },
            { status: 400 }
        );
    }

    // Validate each fee head
    for (const head of feeHeads) {
        if (!head.name || typeof head.amount !== 'number') {
            return NextResponse.json(
                { error: 'Each feeHead must have a name (string) and amount (number).' },
                { status: 400 }
            );
        }
    }

    const fs = await FeeStructure.create({
        batchId,
        semesterNumber,
        feeHeads,
        lateFeePerDay: lateFeePerDay || 0,
        gracePeriodDays: gracePeriodDays ?? 7,
        isActive: true,
    });

    await writeAuditLog({
        action: 'CREATE',
        entityType: 'FeeStructure',
        entityId: fs._id.toString(),
        entityReference: `Batch ${batchId} — Semester ${semesterNumber}`,
        performedBy: session.user.email || 'unknown',
        newState: { batchId, semesterNumber, totalAmount: fs.totalAmount },
    });

    return NextResponse.json(fs, { status: 201 });
});

