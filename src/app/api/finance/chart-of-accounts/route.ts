export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import dbConnect from '@/lib/mongodb';
import ChartOfAccount from '@/models/finance/ChartOfAccount';
import { writeAuditLog } from '@/lib/finance-utils';

// GET /api/finance/chart-of-accounts
export async function GET(req: Request) {
    try {
        await dbConnect();
        const { searchParams } = new URL(req.url);
        const type = searchParams.get('type');
        const activeOnly = searchParams.get('active') !== 'false';

        const query: Record<string, unknown> = {};
        if (type) query.accountType = type;
        if (activeOnly) query.isActive = true;

        const accounts = await ChartOfAccount.find(query)
            .sort({ accountCode: 1 })
            .lean();

        return NextResponse.json(accounts);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// POST /api/finance/chart-of-accounts
export async function POST(req: Request) {
    try {
        const session = await getServerSession();
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await dbConnect();
        const body = await req.json();

        // Validate account code uniqueness
        const existing = await ChartOfAccount.findOne({ accountCode: body.accountCode });
        if (existing) {
            return NextResponse.json({ error: `Account code "${body.accountCode}" already exists.` }, { status: 400 });
        }

        // If parentAccount set, validate it exists
        if (body.parentAccount) {
            const parent = await ChartOfAccount.findById(body.parentAccount);
            if (!parent) {
                return NextResponse.json({ error: 'Parent account not found.' }, { status: 400 });
            }
            if (!parent.isControl) {
                return NextResponse.json({ error: 'Parent account must be a control (header) account.' }, { status: 400 });
            }
        }

        // Determine normalBalance from accountType
        const normalBalance = ['ASSET', 'EXPENSE'].includes(body.accountType) ? 'DEBIT' : 'CREDIT';

        const account = await ChartOfAccount.create({
            ...body,
            normalBalance,
        });

        await writeAuditLog({
            action: 'CREATE',
            entityType: 'ChartOfAccount',
            entityId: account._id.toString(),
            entityReference: account.accountCode,
            performedBy: session.user.email || 'unknown',
            performedByName: session.user.name || undefined,
            newState: account.toObject(),
        });

        return NextResponse.json(account, { status: 201 });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
