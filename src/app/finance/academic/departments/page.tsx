import dbConnect from '@/lib/mongodb';
import Department from '@/models/university/Department';
import DepartmentsManager from './DepartmentsManager';

export const dynamic = 'force-dynamic';

export default async function DepartmentsPage() {
    await dbConnect();

    const rawDepartments = await Department.find()
        .sort({ name: 1 })
        .lean();

    return (
        <div className="max-w-[1100px] mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900 tracking-tight">University Departments</h1>
                <p className="text-sm text-gray-500 mt-1">
                    Manage department records. Used for cost-centre allocation in salaries and administrative expense structuring.
                </p>
            </div>

            <DepartmentsManager
                initialDepartments={JSON.parse(JSON.stringify(rawDepartments))}
            />
        </div>
    );
}
