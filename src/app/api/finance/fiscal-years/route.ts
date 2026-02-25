export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import dbConnect from '@/lib/mongodb';
import FiscalYear from '@/models/finance/FiscalYear';
import AccountingPeriod from '@/models/finance/AccountingPeriod';
import { writeAuditLog } from '@/lib/finance-utils';

// GET /api/finance/fiscal-years
export async function GET() {
    try {
        await dbConnect();
        const years = await FiscalYear.find().sort({ startDate: -1 }).lean();
        return NextResponse.json(years);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// POST /api/finance/fiscal-years
export async function POST(req: Request) {
    try {
        const session = await getServerSession();
        if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        await dbConnect();
        const body = await req.json();
        const { name, startDate, endDate } = body;

        if (!name || !startDate || !endDate) {
            return NextResponse.json({ error: 'name, startDate, and endDate are required.' }, { status: 400 });
        }
        if (new Date(startDate) >= new Date(endDate)) {
            return NextResponse.json({ error: 'startDate must be before endDate.' }, { status: 400 });
        }

        const fy = await FiscalYear.create({ name, startDate, endDate, status: 'OPEN' });

        // Auto-create 12 monthly accounting periods
        const periods = [];
        let current = new Date(startDate);
        for (let i = 1; i <= 12; i++) {
            const periodStart = new Date(current);
            const periodEnd = new Date(current.getFullYear(), current.getMonth() + 1, 0);
            const monthName = periodStart.toLocaleString('default', { month: 'long', year: 'numeric' });
            periods.push({
                fiscalYear: fy._id,
                periodNumber: i,
                periodName: monthName,
                startDate: periodStart,
                endDate: periodEnd,
                isLocked: false,
            });
            current = new Date(current.getFullYear(), current.getMonth() + 1, 1);
        }
        await AccountingPeriod.insertMany(periods);

        await writeAuditLog({
            action: 'CREATE',
            entityType: 'FiscalYear',
            entityId: fy._id.toString(),
            entityReference: fy.name,
            performedBy: session.user.email || 'unknown',
            performedByName: session.user.name || undefined,
        });

        return NextResponse.json({ fiscalYear: fy, periodsCreated: periods.length }, { status: 201 });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
