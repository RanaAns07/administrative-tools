import dbConnect from '@/lib/mongodb';
import SalarySlip from '@/models/finance/SalarySlip';
import PayslipsClient from './PayslipsClient';
// Ensures staff populates correctly
import '@/models/finance/UniversityStaff';

export const dynamic = 'force-dynamic';

export default async function PayslipsPage() {
    await dbConnect();

    // Fetch the last 200 slips to prevent overwhelming the UI, sorted by newest first
    const rawSlips = await SalarySlip.find()
        .populate('staffId', 'name department role employeeCode cnic')
        .sort({ year: -1, month: -1, createdAt: -1 })
        .limit(200)
        .lean();

    // Convert ObjectIds to strings and clean up for client component
    const slips = JSON.parse(JSON.stringify(rawSlips));

    return (
        <div className="max-w-[1300px] mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Payslips</h1>
                <p className="text-sm text-gray-500 mt-1">View historical salary and payroll disbursement records.</p>
            </div>

            <PayslipsClient initialSlips={slips} />
        </div>
    );
}
