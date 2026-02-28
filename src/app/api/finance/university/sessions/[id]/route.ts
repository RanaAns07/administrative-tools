import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import dbConnect from '@/lib/mongodb';
import AcademicSession from '@/models/university/AcademicSession';
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

        const academicSession = await AcademicSession.findById(params.id);
        if (!academicSession) {
            return NextResponse.json({ error: 'Academic Session not found.' }, { status: 404 });
        }

        academicSession.isActive = Boolean(isActive);
        await academicSession.save();

        await writeAuditLog({
            action: 'UPDATE',
            entityType: 'AcademicSession',
            entityId: academicSession._id.toString(),
            entityReference: academicSession.name,
            performedBy: session.user.email || 'unknown',
            newState: { isActive: academicSession.isActive },
        });

        return NextResponse.json(academicSession, { status: 200 });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
