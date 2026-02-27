import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import dbConnect from '@/lib/mongodb';
import StudentProfile from '@/models/university/StudentProfile';
import { writeAuditLog } from '@/lib/finance-utils';

export async function POST(req: Request) {
    try {
        const session = await getServerSession();
        if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        await dbConnect();
        const body = await req.json();
        const { registrationNumber, name, email, batchId, currentSemester } = body;

        if (!registrationNumber || !name || !batchId) {
            return NextResponse.json({ error: 'Registration number, name, and batch are required.' }, { status: 400 });
        }

        const existing = await StudentProfile.findOne({ registrationNumber });
        if (existing) {
            return NextResponse.json({ error: `Student with registration ${registrationNumber} already exists.` }, { status: 400 });
        }

        const student = await StudentProfile.create({
            registrationNumber: registrationNumber.trim(),
            name: name.trim(),
            email: email?.trim().toLowerCase() || null,
            batchId,
            currentSemester: Number(currentSemester) || 1,
            status: 'ACTIVE',
            isActive: true,
        });

        await writeAuditLog({
            action: 'CREATE',
            entityType: 'StudentProfile',
            entityId: student._id.toString(),
            entityReference: student.registrationNumber,
            performedBy: session.user.email || 'unknown',
            newState: { registrationNumber: student.registrationNumber, name: student.name },
        });

        const populated = await StudentProfile.findById(student._id).populate({
            path: 'batchId',
            populate: { path: 'programId' }
        });

        return NextResponse.json(populated, { status: 201 });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
