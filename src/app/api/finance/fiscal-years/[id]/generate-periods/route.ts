import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import dbConnect from '@/lib/mongodb';
import FiscalYear from '@/models/finance/FiscalYear';
import AccountingPeriod from '@/models/finance/AccountingPeriod';

interface Params { params: { id: string } }

// POST /api/finance/fiscal-years/[id]/generate-periods
// Generates the 12 monthly accounting periods for an existing FY that has none
export async function POST(_req: Request, { params }: Params) {
    try {
        const session = await getServerSession();
        if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        await dbConnect();

        const fy = await FiscalYear.findById(params.id);
        if (!fy) return NextResponse.json({ error: 'Fiscal year not found.' }, { status: 404 });

        // Check if periods already exist
        const existing = await AccountingPeriod.countDocuments({ fiscalYear: fy._id });
        if (existing > 0) {
            return NextResponse.json({ error: `${existing} periods already exist for this fiscal year.` }, { status: 409 });
        }

        const periods = [];
        let current = new Date(fy.startDate);
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
        return NextResponse.json({ periodsCreated: periods.length }, { status: 201 });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
