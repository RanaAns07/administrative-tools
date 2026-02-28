import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import dbConnect from '@/lib/mongodb';
import Batch from '@/models/university/Batch';
import { writeAuditLog } from '@/lib/finance-utils';

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
    try {
        const session = await getServerSession();
        if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        await dbConnect();
        const body = await req.json();
        const { isActive } = body;

        if (typeof isActive === 'undefined') {
            return NextResponse.json({ error: 'isActive status is required.' }, { status: 400 });
        }

        const batch = await Batch.findById(params.id);
        if (!batch) {
            return NextResponse.json({ error: 'Batch not found.' }, { status: 404 });
        }

        batch.isActive = Boolean(isActive);
        await batch.save();

        await writeAuditLog({
            action: 'UPDATE',
            entityType: 'Batch',
            entityId: batch._id.toString(),
            entityReference: `${batch.season} ${batch.year}`,
            performedBy: session.user.email || 'unknown',
            newState: { isActive: batch.isActive },
        });

        return NextResponse.json(batch, { status: 200 });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
