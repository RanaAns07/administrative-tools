import StudentFeesClient from './StudentFeesClient';

export const dynamic = 'force-dynamic';

export default function FeeStudentsPage() {
    return (
        <div className="max-w-[1200px] mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Student Fee Profiles</h1>
                <p className="text-sm text-gray-500 mt-1">
                    Search students to view their complete financial ledger, including invoices, payments, advances, and refunds.
                </p>
            </div>

            <StudentFeesClient />
        </div>
    );
}
