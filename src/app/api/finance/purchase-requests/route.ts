export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import dbConnect from '@/lib/mongodb';
import PurchaseRequest from '@/models/finance/PurchaseRequest';
import { generateSequenceNumber, writeAuditLog } from '@/lib/finance-utils';

// GET /api/finance/purchase-requests
export async function GET(req: Request) {
    try {
        await dbConnect();
        const { searchParams } = new URL(req.url);
        const status = searchParams.get('status');
        const query: Record<string, unknown> = {};
        if (status) query.status = status;

        const requests = await PurchaseRequest.find(query)
            .sort({ createdAt: -1 })
            .lean();
        return NextResponse.json(requests);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// POST /api/finance/purchase-requests
export async function POST(req: Request) {
    try {
        const session = await getServerSession();
        if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        await dbConnect();
        const body = await req.json();
        const { title, department, requiredDate, items, justification } = body;

        if (!title || !department || !requiredDate || !items?.length) {
            return NextResponse.json({ error: 'title, department, requiredDate, and items are required.' }, { status: 400 });
        }

        const totalEstimatedCost = items.reduce((s: number, i: any) => s + ((i.estimatedUnitCost || 0) * (i.quantity || 1)), 0);
        const prNumber = await generateSequenceNumber('PR', PurchaseRequest, 'prNumber');

        const pr = await PurchaseRequest.create({
            prNumber,
            title,
            department,
            requiredDate: new Date(requiredDate),
            items,
            totalEstimatedCost,
            justification,
            status: 'DRAFT',
            requestedBy: session.user.email || 'unknown',
            createdBy: session.user.email || 'unknown',
        });

        await writeAuditLog({
            action: 'CREATE',
            entityType: 'PurchaseRequest',
            entityId: pr._id.toString(),
            entityReference: prNumber,
            performedBy: session.user.email || 'unknown',
        });

        return NextResponse.json(pr, { status: 201 });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
