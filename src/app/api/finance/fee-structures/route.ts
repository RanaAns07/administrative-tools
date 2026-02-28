/* eslint-disable @typescript-eslint/no-explicit-any */
export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import dbConnect from '@/lib/mongodb';
import FeeStructure from '@/models/finance/FeeStructure';
import { writeAuditLog } from '@/lib/finance-utils';

/**
 * GET /api/finance/fee-structures
 * List active fee structures.
 * Query params: batchId, semesterNumber
 */
import '@/models/university/Batch'; // Ensure Batch is registered before populate
import '@/models/university/Program'; // Ensure Program is registered before populate
export async function GET(req: Request) {
    try {
        await dbConnect();
        const { searchParams } = new URL(req.url);
        const batchId = searchParams.get('batchId');
        const semesterNumber = searchParams.get('semesterNumber');
        const query: Record<string, unknown> = { isActive: true };
        if (batchId) query.batchId = batchId;
        if (semesterNumber) query.semesterNumber = parseInt(semesterNumber, 10);

        const structures = await FeeStructure.find(query)
            .populate({ path: 'batchId', select: 'year season programId', populate: { path: 'programId', select: 'name code' } })
            .sort({ createdAt: -1 })
            .lean();

        return NextResponse.json(structures);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

/**
 * POST /api/finance/fee-structures
 * Create a new fee structure for a batch/semester.
 *
 * Body: { batchId, semesterNumber, feeHeads: [{name, amount, isOptional?}], lateFeePerDay?, gracePeriodDays? }
 * totalAmount is auto-computed by the FeeStructure pre-save hook.
 */
export async function POST(req: Request) {
    try {
        const session = await getServerSession();
        if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        await dbConnect();
        const body = await req.json();
        const { batchId, semesterNumber, feeHeads, lateFeePerDay, gracePeriodDays } = body;

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
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
