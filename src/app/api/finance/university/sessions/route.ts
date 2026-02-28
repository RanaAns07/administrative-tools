import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import dbConnect from '@/lib/mongodb';
import AcademicSession from '@/models/university/AcademicSession';
import { writeAuditLog } from '@/lib/finance-utils';

export async function POST(req: Request) {
    try {
        const session = await getServerSession();
        if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        await dbConnect();
        const body = await req.json();
        const { name, startDate, endDate } = body;

        if (!name || !startDate || !endDate) {
            return NextResponse.json({ error: 'Name, Start Date, and End Date are required.' }, { status: 400 });
        }

        const existing = await AcademicSession.findOne({ name });
        if (existing) {
            return NextResponse.json({ error: 'An academic session with this name already exists.' }, { status: 400 });
        }

        const academicSession = await AcademicSession.create({
            name,
            startDate: new Date(startDate),
            endDate: new Date(endDate),
            isActive: true,
        });

        await writeAuditLog({
            action: 'CREATE',
            entityType: 'AcademicSession',
            entityId: academicSession._id.toString(),
            entityReference: name,
            performedBy: session.user.email || 'unknown',
            newState: { name, startDate, endDate },
        });

        return NextResponse.json(academicSession, { status: 201 });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
