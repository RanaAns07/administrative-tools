/* eslint-disable @typescript-eslint/no-explicit-any */
export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import dbConnect from '@/lib/mongodb';
import VendorInvoice from '@/models/finance/VendorInvoice';
import { writeAuditLog } from '@/lib/finance-utils';

interface Params { params: { id: string } }

// GET /api/finance/vendor-invoices/[id]
export async function GET(_req: Request, { params }: Params) {
    try {
        await dbConnect();
        const inv = await VendorInvoice.findById(params.id)
            .populate('vendor', 'companyName vendorCode')
            .lean();
        if (!inv) return NextResponse.json({ error: 'Vendor invoice not found.' }, { status: 404 });
        return NextResponse.json(inv);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// PATCH /api/finance/vendor-invoices/[id] — approve, reject, dispute
export async function PATCH(req: Request, { params }: Params) {
    try {
        const session = await getServerSession();
        if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        await dbConnect();
        const { action, rejectionReason } = await req.json();
        const inv = await VendorInvoice.findById(params.id);
        if (!inv) return NextResponse.json({ error: 'Vendor invoice not found.' }, { status: 404 });

        const prev = inv.status;
        const userId = session.user.email || 'unknown';

        switch (action) {
            case 'APPROVE':
                if (!['PENDING', 'DISPUTED'].includes(inv.status)) {
                    return NextResponse.json({ error: 'Only PENDING or DISPUTED invoices can be approved.' }, { status: 400 });
                }
                inv.status = 'APPROVED';
                break;
            case 'REJECT':
            case 'DISPUTE':
                inv.status = 'DISPUTED';
                inv.notes = rejectionReason || inv.notes;
                break;
            default:
                return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
        }

        await inv.save();

        await writeAuditLog({
            action: action as any,
            entityType: 'VendorInvoice',
            entityId: inv._id.toString(),
            entityReference: inv.internalReference,
            performedBy: userId,
            previousState: { status: prev },
            newState: { status: inv.status },
            notes: rejectionReason,
        });

        return NextResponse.json(inv);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
