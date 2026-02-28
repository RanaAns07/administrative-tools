import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import dbConnect from '@/lib/mongodb';
import Department from '@/models/university/Department';
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

        const department = await Department.findById(params.id);
        if (!department) {
            return NextResponse.json({ error: 'Department not found.' }, { status: 404 });
        }

        department.isActive = Boolean(isActive);
        await department.save();

        await writeAuditLog({
            action: 'UPDATE',
            entityType: 'Department',
            entityId: department._id.toString(),
            entityReference: department.code,
            performedBy: session.user.email || 'unknown',
            newState: { isActive: department.isActive },
        });

        return NextResponse.json(department, { status: 200 });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
