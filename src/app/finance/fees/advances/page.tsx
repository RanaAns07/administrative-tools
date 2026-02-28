/* eslint-disable @typescript-eslint/no-explicit-any */
import dbConnect from '@/lib/mongodb';
import StudentAdvanceBalance from '@/models/finance/StudentAdvanceBalance';
import AdvanceBalancesClient from './AdvanceBalancesClient';

export const dynamic = 'force-dynamic';

export default async function AdvanceBalancesPage() {
    await dbConnect();
    const raw = await StudentAdvanceBalance.find({}).sort({ balance: -1 }).lean();
    return (
        <div className="max-w-[1100px] mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Student Advance Balances</h1>
                <p className="text-sm text-gray-500 mt-1">Excess fee payments held as advance credit for students. Applied automatically to future invoices.</p>
            </div>
            <AdvanceBalancesClient initialBalances={JSON.parse(JSON.stringify(raw))} />
        </div>
    );
}
