/* eslint-disable @typescript-eslint/no-explicit-any */
import dbConnect from '@/lib/mongodb';
import UniversityStaff from '@/models/finance/UniversityStaff';
import EmployeesClient from './EmployeesClient';

export const dynamic = 'force-dynamic';

export default async function EmployeesPage() {
    await dbConnect();
    const raw = await UniversityStaff.find({}).sort({ name: 1 }).lean();
    const employees = JSON.parse(JSON.stringify(raw));

    return (
        <div className="max-w-[1300px] mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900 tracking-tight">University Staff</h1>
                <p className="text-sm text-gray-500 mt-1">Staff registry — HR records, designations, and payroll integration.</p>
            </div>
            <EmployeesClient initialEmployees={employees} />
        </div>
    );
}
