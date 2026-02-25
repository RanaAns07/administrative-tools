export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import dbConnect from '@/lib/mongodb';
import JournalEntry from '@/models/finance/JournalEntry';
import { writeAuditLog } from '@/lib/finance-utils';

interface Params { params: { id: string } }

// GET /api/finance/journal-entries/[id]
export async function GET(_req: Request, { params }: Params) {
    try {
        await dbConnect();
        const je = await JournalEntry.findById(params.id)
            .populate('lines.account', 'accountCode accountName accountType')
            .populate('accountingPeriod', 'periodName')
            .populate('fiscalYear', 'name')
            .lean();

        if (!je) return NextResponse.json({ error: 'Journal entry not found.' }, { status: 404 });
        return NextResponse.json(je);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// PATCH /api/finance/journal-entries/[id] — submit, approve, post, reject (state transitions only)
export async function PATCH(req: Request, { params }: Params) {
    try {
        const session = await getServerSession();
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await dbConnect();
        const body = await req.json();
        const { action, rejectionReason } = body;
        const userId = session.user.email || 'unknown';

        const je = await JournalEntry.findById(params.id);
        if (!je) return NextResponse.json({ error: 'Journal entry not found.' }, { status: 404 });

        const prev = je.status;

        switch (action) {
            case 'SUBMIT':
                if (je.status !== 'DRAFT') {
                    return NextResponse.json({ error: 'Only DRAFT entries can be submitted.' }, { status: 400 });
                }
                je.status = 'PENDING_APPROVAL';
                je.submittedAt = new Date();
                break;

            case 'APPROVE':
                if (je.status !== 'PENDING_APPROVAL') {
                    return NextResponse.json({ error: 'Only PENDING_APPROVAL entries can be approved.' }, { status: 400 });
                }
                je.status = 'POSTED';
                je.approvedBy = userId;
                je.approvedAt = new Date();
                je.postedBy = userId;
                je.postedAt = new Date();
                break;

            case 'POST':
                // Direct post (SuperAdmin / Finance Manager shortcut)
                if (!['DRAFT', 'PENDING_APPROVAL'].includes(je.status)) {
                    return NextResponse.json({ error: 'Cannot post an entry that is already posted or rejected.' }, { status: 400 });
                }
                je.status = 'POSTED';
                je.postedBy = userId;
                je.postedAt = new Date();
                break;

            case 'REJECT':
                if (je.status !== 'PENDING_APPROVAL') {
                    return NextResponse.json({ error: 'Only PENDING_APPROVAL entries can be rejected.' }, { status: 400 });
                }
                if (!rejectionReason) {
                    return NextResponse.json({ error: 'Rejection reason is required.' }, { status: 400 });
                }
                je.status = 'REJECTED';
                je.rejectedBy = userId;
                je.rejectedAt = new Date();
                je.rejectionReason = rejectionReason;
                break;

            default:
                return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
        }

        await je.save();

        await writeAuditLog({
            action: action as any,
            entityType: 'JournalEntry',
            entityId: je._id.toString(),
            entityReference: je.entryNumber,
            performedBy: userId,
            performedByName: session.user.name || undefined,
            previousState: { status: prev },
            newState: { status: je.status },
            notes: rejectionReason,
        });

        return NextResponse.json(je);
    } catch (error: any) {
        if (error.message.includes('IMMUTABILITY_VIOLATION')) {
            return NextResponse.json({ error: error.message }, { status: 403 });
        }
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
