export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import AccountingPeriod from '@/models/finance/AccountingPeriod';
import { getServerSession } from 'next-auth';
import { writeAuditLog } from '@/lib/finance-utils';

// GET /api/finance/accounting-periods
export async function GET(req: Request) {
    try {
        await dbConnect();
        const { searchParams } = new URL(req.url);
        const fyId = searchParams.get('fiscalYear');
        const query: Record<string, unknown> = {};
        if (fyId) query.fiscalYear = fyId;

        const periods = await AccountingPeriod.find(query)
            .populate('fiscalYear', 'name')
            .sort({ startDate: 1 })
            .lean();
        return NextResponse.json(periods);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// PATCH /api/finance/accounting-periods — lock or unlock a period
export async function PATCH(req: Request) {
    try {
        const session = await getServerSession();
        if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        await dbConnect();
        const { periodId, action } = await req.json();
        if (!periodId || !['LOCK', 'UNLOCK'].includes(action)) {
            return NextResponse.json({ error: 'periodId and action (LOCK|UNLOCK) are required.' }, { status: 400 });
        }

        const period = await AccountingPeriod.findById(periodId);
        if (!period) return NextResponse.json({ error: 'Period not found.' }, { status: 404 });

        const prev = period.isLocked;
        period.isLocked = action === 'LOCK';
        if (action === 'LOCK') {
            period.lockedAt = new Date();
            period.lockedBy = session.user.email || 'unknown';
        } else {
            period.lockedAt = undefined;
            period.lockedBy = undefined;
        }
        await period.save();

        await writeAuditLog({
            action: 'LOCK_PERIOD',
            entityType: 'AccountingPeriod',
            entityId: period._id.toString(),
            entityReference: period.periodName,
            performedBy: session.user.email || 'unknown',
            performedByName: session.user.name || undefined,
            previousState: { isLocked: prev },
            newState: { isLocked: period.isLocked },
        });

        return NextResponse.json(period);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
