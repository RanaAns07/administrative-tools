import dbConnect from '@/lib/mongodb';
import UniversityStaff from '@/models/finance/UniversityStaff';
import DesignationsClient from './DesignationsClient';

export const dynamic = 'force-dynamic';

export default async function DesignationsPage() {
    await dbConnect();

    const uniqueDepartments = await UniversityStaff.distinct('department', { isActive: true });
    const uniqueRoles = await UniversityStaff.distinct('role', { isActive: true });

    return (
        <div className="max-w-[1300px] mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Designations & Departments</h1>
                <p className="text-sm text-gray-500 mt-1">Overview of organizational roles and active departments.</p>
            </div>
            <DesignationsClient
                uniqueDepartments={uniqueDepartments.sort()}
                uniqueRoles={uniqueRoles.sort()}
            />
        </div>
    );
}
