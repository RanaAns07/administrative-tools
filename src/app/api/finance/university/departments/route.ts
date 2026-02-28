import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import dbConnect from '@/lib/mongodb';
import Department from '@/models/university/Department';
import { writeAuditLog } from '@/lib/finance-utils';

export async function POST(req: Request) {
    try {
        const session = await getServerSession();
        if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        await dbConnect();
        const body = await req.json();
        const { name, code, headOfDepartment } = body;

        if (!name || !code) {
            return NextResponse.json({ error: 'Name and Code are required.' }, { status: 400 });
        }

        const existing = await Department.findOne({ $or: [{ name }, { code }] });
        if (existing) {
            return NextResponse.json({ error: 'A department with this name or code already exists.' }, { status: 400 });
        }

        const department = await Department.create({
            name,
            code,
            headOfDepartment,
            isActive: true,
        });

        await writeAuditLog({
            action: 'CREATE',
            entityType: 'Department',
            entityId: department._id.toString(),
            entityReference: code,
            performedBy: session.user.email || 'unknown',
            newState: { name, code, headOfDepartment },
        });

        return NextResponse.json(department, { status: 201 });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
