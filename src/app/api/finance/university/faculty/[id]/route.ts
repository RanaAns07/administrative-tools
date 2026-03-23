import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import dbConnect from '@/lib/mongodb';
import Employee from '@/models/finance/Employee';
import { writeAuditLog } from '@/lib/finance-utils';

export async function PUT(req: Request, { params }: { params: { id: string } }) {
    try {
        const session = await getServerSession();
        if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        await dbConnect();
        const body = await req.json();
        const { name, cnic, designation, department, employeeType, joiningDate, basicSalary } = body;

        const employee = await Employee.findById(params.id);
        if (!employee) {
            return NextResponse.json({ error: 'Faculty member not found' }, { status: 404 });
        }

        // Check if another employee is already using this CNIC
        const existingCnic = await Employee.findOne({ cnic, _id: { $ne: params.id } });
        if (existingCnic) {
            return NextResponse.json({ error: 'Another employee is already registered with this CNIC.' }, { status: 400 });
        }

        const oldState = { name: employee.name, cnic: employee.cnic, designation: employee.designation, department: employee.department, basicSalary: employee.basicSalary };

        employee.name = name;
        employee.cnic = cnic;
        employee.designation = designation;
        employee.department = department;
        employee.employeeType = employeeType;
        if (joiningDate) employee.joiningDate = new Date(joiningDate);
        if (basicSalary !== undefined && basicSalary !== null) employee.basicSalary = Number(basicSalary);

        await employee.save();

        await writeAuditLog({
            action: 'UPDATE',
            entityType: 'Employee',
            entityId: employee._id.toString(),
            entityReference: employee.employeeCode,
            performedBy: session.user.email || 'system',
            newState: { name, cnic, designation, department, basicSalary },
            notes: `Edited faculty details for ${employee.employeeCode}`
        });

        return NextResponse.json(employee, { status: 200 });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
    try {
        const session = await getServerSession();
        if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        await dbConnect();

        const employee = await Employee.findById(params.id);
        if (!employee) {
            return NextResponse.json({ error: 'Faculty member not found' }, { status: 404 });
        }

        await Employee.findByIdAndDelete(params.id);

        await writeAuditLog({
            action: 'DELETE',
            entityType: 'Employee',
            entityId: employee._id.toString(),
            entityReference: employee.employeeCode,
            performedBy: session.user.email || 'system',
            notes: `Deleted faculty member: ${employee.name}`
        });

        return NextResponse.json({ success: true, message: 'Faculty member deleted correctly' }, { status: 200 });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
