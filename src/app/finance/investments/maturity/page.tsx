/* eslint-disable @typescript-eslint/no-explicit-any */
import dbConnect from '@/lib/mongodb';
import Investment from '@/models/finance/Investment';
import MaturityClient from './MaturityClient';
import { Calendar } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function InvestmentMaturityPage() {
    await dbConnect();

    // Fetch all active investments
    const rawInvestments = await Investment.find({ status: 'ACTIVE' })
        .populate('sourceWalletId', 'name')
        .sort({ maturityDate: 1 }) // Earliest maturity first
        .lean();

    return (
        <div className="max-w-[1300px] mx-auto space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold text-leads-blue uppercase tracking-widest">Future Planning</span>
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
                        <Calendar className="text-leads-blue" />
                        Maturity Tracking
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">Monitor upcoming investment maturities with alerts for placements due within 30, 60, and 90 days.</p>
                </div>
            </div>

            <MaturityClient
                initialInvestments={JSON.parse(JSON.stringify(rawInvestments))}
            />
        </div>
    );
}
