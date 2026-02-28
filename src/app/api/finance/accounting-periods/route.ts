/**
 * @file /api/finance/accounting-periods/route.ts
 * @description Month Lock/Unlock Control
 *
 * GET  — list all accounting periods
 * POST — create or open a period
 * PATCH — lock or unlock a period (Finance Admin only)
 */

export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import mongoose from 'mongoose';
import dbConnect from '@/lib/mongodb';
import AccountingPeriod from '@/models/finance/AccountingPeriod';
import { writeAuditLog } from '@/lib/finance-utils';

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await dbConnect();

    const periods = await AccountingPeriod.find()
        .populate('lockedBy', 'name email')
        .sort({ year: -1, month: -1 })
        .lean();

    return NextResponse.json(periods);
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await dbConnect();

    let body: { month: number; year: number; notes?: string };
    try { body = await req.json(); } catch {
        return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 });
    }

    const { month, year, notes } = body;
    if (!month || !year || month < 1 || month > 12) {
        return NextResponse.json({ error: 'Valid month (1–12) and year are required.' }, { status: 400 });
    }

    try {
        const period = await AccountingPeriod.findOneAndUpdate(
            { month, year },
            { $setOnInsert: { month, year, status: 'OPEN', notes } },
            { upsert: true, new: true }
        );
        return NextResponse.json(period, { status: 201 });
    } catch (err) {
        if (err instanceof Error && err.message.includes('duplicate')) {
            return NextResponse.json({ error: `Period ${month}/${year} already exists.` }, { status: 409 });
        }
        return NextResponse.json({ error: err instanceof Error ? err.message : 'Error' }, { status: 500 });
    }
}

export async function PATCH(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await dbConnect();

    let body: { id: string; action: 'LOCK' | 'UNLOCK'; notes?: string };
    try { body = await req.json(); } catch {
        return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 });
    }

    const { id, action, notes } = body;
    if (!id || !mongoose.isValidObjectId(id) || !['LOCK', 'UNLOCK'].includes(action)) {
        return NextResponse.json({ error: 'Valid id and action (LOCK/UNLOCK) required.' }, { status: 400 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userId = new mongoose.Types.ObjectId((session.user as any)._id || '000000000000000000000000');

    const update = action === 'LOCK'
        ? { status: 'LOCKED', lockedBy: userId, lockedAt: new Date(), notes }
        : { status: 'OPEN', unlockedBy: userId, unlockedAt: new Date(), notes };

    const period = await AccountingPeriod.findByIdAndUpdate(id, update, { new: true });
    if (!period) return NextResponse.json({ error: 'Period not found.' }, { status: 404 });

    await writeAuditLog({
        action: `PERIOD_${action}ED`,
        entityType: 'AccountingPeriod',
        entityId: id,
        entityReference: `${period.month}/${period.year}`,
        performedBy: session.user.email || 'unknown',
        newState: { status: period.status },
    });

    return NextResponse.json(period);
}
