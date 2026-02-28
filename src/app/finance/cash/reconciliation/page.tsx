/* eslint-disable @typescript-eslint/no-explicit-any */
import dbConnect from '@/lib/mongodb';
import Wallet from '@/models/finance/Wallet';
import Transaction from '@/models/finance/Transaction';
import ReconciliationClient from './ReconciliationClient';
import { ShieldCheck } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function ReconciliationPage({
    searchParams,
}: {
    searchParams: { walletId?: string; month?: string };
}) {
    await dbConnect();

    const rawWallets = await Wallet.find({ isActive: true }).sort({ name: 1 }).lean();
    const wallets = JSON.parse(JSON.stringify(rawWallets));

    const selectedWalletId = searchParams.walletId;
    let transactions: any[] = [];

    if (selectedWalletId) {
        // Fetch recent transactions for this wallet to assist in reconciliation
        const query: any = { walletId: selectedWalletId };

        // If a month is selected (YYYY-MM), filter by that month
        if (searchParams.month) {
            const [year, month] = searchParams.month.split('-');
            const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
            const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59, 999);
            query.date = { $gte: startDate, $lte: endDate };
        } else {
            // Default to last 30 days if no month selected to avoid loading too much
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            query.date = { $gte: thirtyDaysAgo };
        }

        const rawTxns = await Transaction.find(query)
            .sort({ date: -1 })
            .limit(100)
            .lean();
        transactions = JSON.parse(JSON.stringify(rawTxns));
    }

    return (
        <div className="max-w-[1200px] mx-auto space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold text-leads-blue uppercase tracking-widest">Audit & Control</span>
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
                        <ShieldCheck className="text-leads-blue" />
                        Bank & Cash Reconciliation
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">Match your physical cash or bank statement against the system ledger.</p>
                </div>
            </div>

            <ReconciliationClient wallets={wallets} initialTransactions={transactions} />
        </div>
    );
}
