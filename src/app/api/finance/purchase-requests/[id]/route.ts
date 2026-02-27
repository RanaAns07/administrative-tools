/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import dbConnect from '@/lib/mongodb';
import PurchaseRequest from '@/models/finance/PurchaseRequest';
import { writeAuditLog } from '@/lib/finance-utils';

interface Params { params: { id: string } }

// PATCH /api/finance/purchase-requests/[id] — submit, approve, reject
export async function PATCH(req: Request, { params }: Params) {
    try {
        const session = await getServerSession();
        if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        await dbConnect();
        const { action, rejectionReason } = await req.json();
        const pr = await PurchaseRequest.findById(params.id);
        if (!pr) return NextResponse.json({ error: 'Purchase request not found.' }, { status: 404 });

        const prev = pr.status;

        switch (action) {
            case 'SUBMIT':
                if (pr.status !== 'DRAFT') return NextResponse.json({ error: 'Only DRAFT requests can be submitted.' }, { status: 400 });
                pr.status = 'PENDING_APPROVAL';
                break;
            case 'APPROVE':
                if (pr.status !== 'PENDING_APPROVAL') return NextResponse.json({ error: 'Only PENDING_APPROVAL requests can be approved.' }, { status: 400 });
                pr.status = 'APPROVED';
                pr.approvedBy = session.user.email || 'unknown';
                pr.approvedAt = new Date();
                break;
            case 'REJECT':
                if (pr.status !== 'PENDING_APPROVAL') return NextResponse.json({ error: 'Only PENDING_APPROVAL requests can be rejected.' }, { status: 400 });
                pr.status = 'REJECTED';
                pr.rejectedBy = session.user.email || 'unknown';
                pr.rejectionReason = rejectionReason || 'No reason provided';
                break;
            default:
                return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
        }

        await pr.save();
        await writeAuditLog({
            action: action as any,
            entityType: 'PurchaseRequest',
            entityId: pr._id.toString(),
            entityReference: pr.prNumber,
            performedBy: session.user.email || 'unknown',
            previousState: { status: prev },
            newState: { status: pr.status },
        });

        return NextResponse.json(pr);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
