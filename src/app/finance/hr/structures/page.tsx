import dbConnect from '@/lib/mongodb';
import StaffPayComponent from '@/models/finance/StaffPayComponent';
import UniversityStaff from '@/models/finance/UniversityStaff';
import StructuresClient from './StructuresClient';

export const dynamic = 'force-dynamic';

export default async function HRStructuresPage() {
    await dbConnect();

    // Fetch components
    const rawComponents = await StaffPayComponent.find()
        .populate('staffId', 'name department role employmentType')
        .sort({ createdAt: -1 })
        .lean();

    // Fetch staff for the dropdown
    const rawStaff = await UniversityStaff.find({ isActive: true })
        .sort({ name: 1 })
        .lean();

    return (
        <div className="max-w-[1300px] mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Salary Structures</h1>
                <p className="text-sm text-gray-500 mt-1">Configure itemized allowances and deductions for individual staff members.</p>
            </div>
            <StructuresClient
                initialComponents={JSON.parse(JSON.stringify(rawComponents))}
                staff={JSON.parse(JSON.stringify(rawStaff))}
            />
        </div>
    );
}
