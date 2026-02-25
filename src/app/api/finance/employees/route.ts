import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import dbConnect from '@/lib/mongodb';
import Employee from '@/models/finance/Employee';
import { generateSequenceNumber, writeAuditLog } from '@/lib/finance-utils';

export async function GET(req: Request) {
    try {
        await dbConnect();
        const { searchParams } = new URL(req.url);
        const status = searchParams.get('status') || 'ACTIVE';
        const dept = searchParams.get('department');
        const query: Record<string, unknown> = {};
        if (status !== 'ALL') query.status = status;
        if (dept) query.department = new RegExp(dept, 'i');

        const employees = await Employee.find(query).sort({ name: 1 }).lean();
        return NextResponse.json(employees);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const session = await getServerSession();
        if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        await dbConnect();
        const body = await req.json();
        const required = ['name', 'cnic', 'designation', 'department', 'employeeType', 'joiningDate', 'basicSalary', 'payrollAccountCode'];
        for (const f of required) {
            if (!body[f]) return NextResponse.json({ error: `${f} is required.` }, { status: 400 });
        }

        const employeeCode = await generateSequenceNumber('EMP', Employee, 'employeeCode');
        const employee = await Employee.create({ ...body, employeeCode, createdBy: session.user.email || 'unknown' });

        await writeAuditLog({
            action: 'CREATE',
            entityType: 'Employee',
            entityId: employee._id.toString(),
            entityReference: `${employeeCode} - ${body.name}`,
            performedBy: session.user.email || 'unknown',
        });

        return NextResponse.json(employee, { status: 201 });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
