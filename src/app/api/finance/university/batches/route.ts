import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import dbConnect from '@/lib/mongodb';
import Batch from '@/models/university/Batch';
import { writeAuditLog } from '@/lib/finance-utils';

export async function POST(req: Request) {
    try {
        const session = await getServerSession();
        if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        await dbConnect();
        const body = await req.json();
        const { programId, year, season } = body;

        if (!programId || !year || !season) {
            return NextResponse.json({ error: 'Program ID, year, and season are required.' }, { status: 400 });
        }

        const existing = await Batch.findOne({ programId, year, season });
        if (existing) {
            return NextResponse.json({ error: `A batch for this program in ${season} ${year} already exists.` }, { status: 400 });
        }

        const batch = await Batch.create({
            programId,
            year: Number(year),
            season,
            isActive: true,
        });

        await writeAuditLog({
            action: 'CREATE',
            entityType: 'Batch',
            entityId: batch._id.toString(),
            entityReference: `${season} ${year}`,
            performedBy: session.user.email || 'unknown',
            newState: { programId, year, season },
        });

        return NextResponse.json(batch, { status: 201 });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
