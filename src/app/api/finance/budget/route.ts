export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import dbConnect from '@/lib/mongodb';
import Budget from '@/models/finance/Budget';
import { writeAuditLog } from '@/lib/finance-utils';

export async function GET(req: Request) {
    try {
        await dbConnect();
        const { searchParams } = new URL(req.url);
        const fyId = searchParams.get('fiscalYear');
        const query: Record<string, unknown> = {};
        if (fyId) query.fiscalYear = fyId;

        const budgets = await Budget.find(query)
            .populate('fiscalYear', 'name')
            .sort({ createdAt: -1 })
            .lean();
        return NextResponse.json(budgets);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const session = await getServerSession();
        if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        await dbConnect();
        const body = await req.json();
        const { fiscalYear, budgetName, budgetLines, allowOverspend } = body;

        if (!fiscalYear || !budgetName || !budgetLines?.length) {
            return NextResponse.json({ error: 'fiscalYear, budgetName, budgetLines are required.' }, { status: 400 });
        }

        const totalBudget = budgetLines.reduce((s: number, l: any) => s + (l.budgetedAmount || 0), 0);

        const budget = await Budget.create({
            fiscalYear, budgetName, budgetLines,
            totalBudget, allowOverspend: allowOverspend || false,
            status: 'ACTIVE',
            createdBy: session.user.email || 'unknown',
        });

        await writeAuditLog({
            action: 'CREATE',
            entityType: 'Budget',
            entityId: budget._id.toString(),
            entityReference: budgetName,
            performedBy: session.user.email || 'unknown',
            newState: { totalBudget },
        });

        return NextResponse.json(budget, { status: 201 });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
