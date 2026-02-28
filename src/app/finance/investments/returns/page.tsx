/* eslint-disable @typescript-eslint/no-explicit-any */
import dbConnect from '@/lib/mongodb';
import Investment from '@/models/finance/Investment';
import Wallet from '@/models/finance/Wallet';
import InvestmentReturnsClient from './InvestmentReturnsClient';

export const dynamic = 'force-dynamic';

export default async function InvestmentReturnsPage() {
    await dbConnect();

    // Fetch investments that are ACTIVE or MATURED (exclude withdrawn)
    const rawInvestments = await Investment.find({ status: { $in: ['ACTIVE', 'MATURED'] } })
        .populate('sourceWalletId', 'name')
        .populate('returnWalletId', 'name')
        .sort({ maturityDate: 1, startDate: -1 })
        .lean();

    const rawWallets = await Wallet.find({ isActive: true }).sort({ name: 1 }).lean();

    return (
        <div className="max-w-[1300px] mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Investment Returns</h1>
                <p className="text-sm text-gray-500 mt-1">Record maturity returns and early withdrawal proceeds from fixed deposits and other placements.</p>
            </div>
            <InvestmentReturnsClient
                initialInvestments={JSON.parse(JSON.stringify(rawInvestments))}
                wallets={JSON.parse(JSON.stringify(rawWallets))}
            />
        </div>
    );
}
