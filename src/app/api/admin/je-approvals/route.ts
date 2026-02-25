import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import JournalEntry from '@/models/finance/JournalEntry';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { writeAuditLog } from '@/lib/finance-utils';

// GET /api/admin/je-approvals?status=PENDING_APPROVAL
export async function GET(req: NextRequest) {
    try {
        await dbConnect();
        const status = req.nextUrl.searchParams.get('status') || 'PENDING_APPROVAL';

        const entries = await JournalEntry.find({ status })
            .sort({ createdAt: -1 })
            .lean();

        return NextResponse.json(entries);
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// PATCH /api/admin/je-approvals — bulk or single approve/reject
export async function PATCH(req: NextRequest) {
    try {
        await dbConnect();
        const session = await getServerSession(authOptions as any);
        const body = await req.json();
        const { jeId, action, rejectionReason } = body;

        if (!jeId || !action) {
            return NextResponse.json({ error: 'jeId and action are required' }, { status: 400 });
        }
        if (!['APPROVE', 'REJECT'].includes(action)) {
            return NextResponse.json({ error: 'action must be APPROVE or REJECT' }, { status: 400 });
        }
        if (action === 'REJECT' && !rejectionReason) {
            return NextResponse.json({ error: 'Rejection reason is required' }, { status: 400 });
        }

        const je = await JournalEntry.findById(jeId);
        if (!je) return NextResponse.json({ error: 'Journal entry not found' }, { status: 404 });
        if (je.status !== 'PENDING_APPROVAL') {
            return NextResponse.json({ error: 'Entry is not in PENDING_APPROVAL state' }, { status: 409 });
        }

        const userId = (session as any)?.user?.email || 'admin';
        const prev = je.status;

        if (action === 'APPROVE') {
            je.status = 'POSTED';
            je.approvedBy = userId;
            je.approvedAt = new Date();
            je.postedBy = userId;
            je.postedAt = new Date();
        } else {
            je.status = 'REJECTED';
            je.rejectedBy = userId;
            je.rejectedAt = new Date();
            je.rejectionReason = rejectionReason;
        }

        await je.save();

        await writeAuditLog({
            action: action === 'APPROVE' ? 'APPROVE' : 'REJECT',
            entityType: 'JournalEntry',
            entityId: je._id.toString(),
            entityReference: je.entryNumber,
            performedBy: userId,
            previousState: { status: prev },
            newState: { status: je.status },
            notes: rejectionReason,
        });

        return NextResponse.json({ success: true, je });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
