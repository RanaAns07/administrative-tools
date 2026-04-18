import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import dbConnect from '@/lib/mongodb';
import Batch from '@/models/university/Batch';
import { writeAuditLog } from '@/lib/finance-utils';

import '@/models/university/Program'; // Ensure Program is registered before populate

export async function PUT(req: Request, { params }: { params: { id: string } }) {
    try {
        const session = await getServerSession();
        if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        await dbConnect();
        const body = await req.json();
        const { year, season, programId, isActive } = body;

        const batch = await Batch.findById(params.id);
        if (!batch) return NextResponse.json({ error: 'Batch not found' }, { status: 404 });

        const oldState = { year: batch.year, season: batch.season, programId: batch.programId, isActive: batch.isActive };

        if (year) batch.year = Number(year);
        if (season) batch.season = season;
        if (programId) batch.programId = programId;
        if (typeof isActive !== 'undefined') batch.isActive = Boolean(isActive);

        await batch.save();

        await writeAuditLog({
            action: 'UPDATE',
            entityType: 'Batch',
            entityId: batch._id.toString(),
            entityReference: `${batch.season} ${batch.year}`,
            performedBy: session.user.email || 'unknown',
            oldState,
            newState: { year: batch.year, season: batch.season, programId: batch.programId, isActive: batch.isActive },
        });

        // Fetch again to populate programId for the UI
        const updated = await Batch.findById(batch._id).populate('programId', 'name code');

        return NextResponse.json(updated);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
    try {
        const session = await getServerSession();
        if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        await dbConnect();
        const batch = await Batch.findById(params.id);
        if (!batch) return NextResponse.json({ error: 'Batch not found' }, { status: 404 });

        await Batch.findByIdAndDelete(params.id);

        await writeAuditLog({
            action: 'DELETE',
            entityType: 'Batch',
            entityId: params.id,
            entityReference: `${batch.season} ${batch.year}`,
            performedBy: session.user.email || 'unknown',
            oldState: { year: batch.year, season: batch.season },
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// Keep PATCH for backward compatibility if needed, though PUT handles isActive now
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
    return PUT(req, { params });
}
