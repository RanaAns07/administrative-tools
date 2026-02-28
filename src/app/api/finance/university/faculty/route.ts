import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import dbConnect from '@/lib/mongodb';
import Employee from '@/models/finance/Employee';
import { writeAuditLog } from '@/lib/finance-utils';

function generateEmployeeCode() {
    return 'EMP-' + Math.floor(1000 + Math.random() * 9000).toString();
}

export async function POST(req: Request) {
    try {
        const session = await getServerSession();
        if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        await dbConnect();
        const body = await req.json();
        const { name, cnic, designation, department, employeeType, joiningDate, basicSalary } = body;

        if (!name || !cnic || !designation || !department) {
            return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
        }

        const existing = await Employee.findOne({ cnic });
        if (existing) {
            return NextResponse.json({ error: 'An employee with this CNIC already exists.' }, { status: 400 });
        }

        // Generate custom code and define base salary account
        const employeeCode = generateEmployeeCode();
        const payrollAccountCode = '5001'; // Default salary expense code

        const employee = await Employee.create({
            employeeCode,
            name,
            cnic,
            designation,
            department,
            employeeType,
            joiningDate: new Date(joiningDate),
            basicSalary: Number(basicSalary),
            payrollAccountCode,
            createdBy: session.user.email || 'system',
            status: 'ACTIVE'
        });

        await writeAuditLog({
            action: 'CREATE',
            entityType: 'Employee',
            entityId: employee._id.toString(),
            entityReference: employeeCode,
            performedBy: session.user.email || 'unknown',
            newState: { name, designation, department },
        });

        return NextResponse.json(employee, { status: 201 });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
