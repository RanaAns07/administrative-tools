import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import dbConnect from '@/lib/mongodb';
import FeeStructure from '@/models/finance/FeeStructure';
import { writeAuditLog } from '@/lib/finance-utils';

export async function PUT(req: Request, { params }: { params: { id: string } }) {
    try {
        const session = await getServerSession();
        if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        await dbConnect();
        const body = await req.json();
        const { batchId, semesterNumber, lateFeePerDay, gracePeriodDays, feeHeads, isActive } = body;

        const structure = await FeeStructure.findById(params.id);
        if (!structure) return NextResponse.json({ error: 'Fee Structure not found' }, { status: 404 });

        const oldState = { 
            batchId: structure.batchId, 
            semesterNumber: structure.semesterNumber, 
            totalAmount: structure.totalAmount,
            isActive: structure.isActive 
        };

        if (batchId) structure.batchId = batchId;
        if (typeof semesterNumber !== 'undefined') structure.semesterNumber = Number(semesterNumber);
        if (typeof lateFeePerDay !== 'undefined') structure.lateFeePerDay = Number(lateFeePerDay);
        if (typeof gracePeriodDays !== 'undefined') structure.gracePeriodDays = Number(gracePeriodDays);
        if (feeHeads) structure.feeHeads = feeHeads;
        if (typeof isActive !== 'undefined') structure.isActive = Boolean(isActive);

        await structure.save();

        await writeAuditLog({
            action: 'UPDATE',
            entityType: 'FeeStructure',
            entityId: structure._id.toString(),
            entityReference: `Semester ${structure.semesterNumber}`,
            performedBy: session.user.email || 'unknown',
            oldState,
            newState: { 
                batchId: structure.batchId, 
                semesterNumber: structure.semesterNumber, 
                totalAmount: structure.totalAmount,
                isActive: structure.isActive 
            },
        });

        const updated = await FeeStructure.findById(structure._id).populate({
            path: 'batchId',
            select: 'year season',
            populate: { path: 'programId', select: 'name code' }
        });

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
        const structure = await FeeStructure.findById(params.id);
        if (!structure) return NextResponse.json({ error: 'Fee Structure not found' }, { status: 404 });

        await FeeStructure.findByIdAndDelete(params.id);

        await writeAuditLog({
            action: 'DELETE',
            entityType: 'FeeStructure',
            entityId: params.id,
            entityReference: `Semester ${structure.semesterNumber}`,
            performedBy: session.user.email || 'unknown',
            oldState: { semesterNumber: structure.semesterNumber, totalAmount: structure.totalAmount },
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
