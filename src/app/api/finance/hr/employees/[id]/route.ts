import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import dbConnect from '@/lib/mongodb';
import UniversityStaff from '@/models/finance/UniversityStaff';
import { writeAuditLog } from '@/lib/finance-utils';

export async function PUT(req: Request, { params }: { params: { id: string } }) {
    try {
        const session = await getServerSession();
        if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        await dbConnect();
        const body = await req.json();

        // Basic validation
        if (!body.name || !body.role || !body.department || !body.employmentType) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const employee = await UniversityStaff.findById(params.id);
        if (!employee) {
            return NextResponse.json({ error: 'Staff member not found' }, { status: 404 });
        }

        const updatedStaff = await UniversityStaff.findByIdAndUpdate(params.id, body, { new: true, runValidators: true });

        if (!updatedStaff) {
            return NextResponse.json({ error: 'Failed to update staff member' }, { status: 500 });
        }

        await writeAuditLog({
            action: 'UPDATE',
            entityType: 'UniversityStaff',
            entityId: updatedStaff._id.toString(),
            entityReference: updatedStaff.cnic || updatedStaff.name,
            performedBy: session.user.email || 'system',
            newState: body,
            notes: `Updated HR staff details for ${updatedStaff.name}`
        });

        return NextResponse.json(updatedStaff, { status: 200 });
    } catch (error: any) {
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map((val: any) => val.message);
            return NextResponse.json({ error: messages.join(', ') }, { status: 400 });
        }
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
    try {
        const session = await getServerSession();
        if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        await dbConnect();

        const employee = await UniversityStaff.findById(params.id);
        if (!employee) {
            return NextResponse.json({ error: 'Staff member not found' }, { status: 404 });
        }

        await UniversityStaff.findByIdAndDelete(params.id);

        await writeAuditLog({
            action: 'DELETE',
            entityType: 'UniversityStaff',
            entityId: employee._id.toString(),
            entityReference: employee.cnic || employee.name,
            performedBy: session.user.email || 'system',
            notes: `Deleted HR staff member: ${employee.name}`
        });

        return NextResponse.json({ success: true, message: 'Staff member deleted' }, { status: 200 });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
