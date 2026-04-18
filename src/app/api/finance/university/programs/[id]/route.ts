import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import dbConnect from '@/lib/mongodb';
import Program from '@/models/university/Program';
import { writeAuditLog } from '@/lib/finance-utils';

export async function PUT(req: Request, { params }: { params: { id: string } }) {
    try {
        const session = await getServerSession();
        if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        await dbConnect();
        const body = await req.json();
        const { name, code, totalSemesters, isActive } = body;

        const program = await Program.findById(params.id);
        if (!program) return NextResponse.json({ error: 'Program not found' }, { status: 404 });

        const oldState = { name: program.name, code: program.code, totalSemesters: program.totalSemesters, isActive: program.isActive };

        if (name) program.name = name.trim();
        if (code) program.code = code.trim().toUpperCase();
        if (typeof totalSemesters !== 'undefined') program.totalSemesters = Number(totalSemesters);
        if (typeof isActive !== 'undefined') program.isActive = Boolean(isActive);

        await program.save();

        await writeAuditLog({
            action: 'UPDATE',
            entityType: 'Program',
            entityId: program._id.toString(),
            entityReference: program.code,
            performedBy: session.user.email || 'unknown',
            oldState,
            newState: { name: program.name, code: program.code, totalSemesters: program.totalSemesters, isActive: program.isActive },
        });

        return NextResponse.json(program);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
    try {
        const session = await getServerSession();
        if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        await dbConnect();
        const program = await Program.findById(params.id);
        if (!program) return NextResponse.json({ error: 'Program not found' }, { status: 404 });

        // Check if program has batches before deleting (optional safety)
        // For now, let's just delete or mark inactive. User asked for delete functionality.
        await Program.findByIdAndDelete(params.id);

        await writeAuditLog({
            action: 'DELETE',
            entityType: 'Program',
            entityId: params.id,
            entityReference: program.code,
            performedBy: session.user.email || 'unknown',
            oldState: { name: program.name, code: program.code },
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
