import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import dbConnect from '@/lib/mongodb';
import StaffPayComponent from '@/models/finance/StaffPayComponent';

export const dynamic = 'force-dynamic';

export async function PUT(req: Request, { params }: { params: { id: string } }) {
    try {
        const session = await getServerSession();
        if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        await dbConnect();
        const body = await req.json();

        const updated = await StaffPayComponent.findByIdAndUpdate(
            params.id,
            { $set: body },
            { new: true, runValidators: true }
        )
            .populate('staffId', 'name department role employmentType')
            .lean();

        if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 });

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
        const deleted = await StaffPayComponent.findByIdAndDelete(params.id);
        if (!deleted) return NextResponse.json({ error: 'Not found' }, { status: 404 });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
