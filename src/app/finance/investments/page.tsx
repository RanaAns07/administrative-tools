/* eslint-disable @typescript-eslint/no-explicit-any */
import dbConnect from '@/lib/mongodb';
import Investment from '@/models/finance/Investment';
import Wallet from '@/models/finance/Wallet';
import InvestmentsClient from './InvestmentsClient';

export const dynamic = 'force-dynamic';

export default async function InvestmentsPage() {
    await dbConnect();
    const [rawInvestments, rawWallets] = await Promise.all([
        Investment.find({}).sort({ createdAt: -1 }).lean(),
        Wallet.find({ isActive: true }).sort({ name: 1 }).lean(),
    ]);
    return (
        <div className="max-w-[1300px] mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Investments</h1>
                <p className="text-sm text-gray-500 mt-1">Track fixed deposits, short-term placements, and capital investments.</p>
            </div>
            <InvestmentsClient
                initialInvestments={JSON.parse(JSON.stringify(rawInvestments))}
                wallets={JSON.parse(JSON.stringify(rawWallets))}
            />
        </div>
    );
}
