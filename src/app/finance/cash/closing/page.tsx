/* eslint-disable @typescript-eslint/no-explicit-any */
import dbConnect from '@/lib/mongodb';
import Wallet from '@/models/finance/Wallet';
import Transaction from '@/models/finance/Transaction';
import DailyClosingClient from './DailyClosingClient';
import { LockKeyhole } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function DailyClosingPage({
    searchParams,
}: {
    searchParams: { date?: string };
}) {
    await dbConnect();

    // Default to today in local timezone (YYYY-MM-DD)
    const tzOffset = (new Date()).getTimezoneOffset() * 60000;
    const localISOTime = (new Date(Date.now() - tzOffset)).toISOString().slice(0, 10);
    const selectedDateStr = searchParams.date || localISOTime;

    // Build the date range for the query
    const [year, month, day] = selectedDateStr.split('-');
    const startDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), 0, 0, 0);
    const endDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), 23, 59, 59, 999);

    // Fetch active wallets for end-of-day balances (current balance in DB)
    const rawWallets = await Wallet.find({ isActive: true }).sort({ type: 1, name: 1 }).lean();
    const wallets = JSON.parse(JSON.stringify(rawWallets));

    // Fetch transactions for the selected date
    const query = { date: { $gte: startDate, $lte: endDate } };
    const rawTxns = await Transaction.find(query).populate('walletId', 'name type').lean();
    const transactions = JSON.parse(JSON.stringify(rawTxns));

    return (
        <div className="max-w-[1200px] mx-auto space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold text-leads-blue uppercase tracking-widest">End of Day</span>
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
                        <LockKeyhole className="text-leads-blue" />
                        Daily Closing Report
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">Review activity and finalize books for the day.</p>
                </div>
            </div>

            <DailyClosingClient
                selectedDate={selectedDateStr}
                wallets={wallets}
                transactions={transactions}
            />
        </div>
    );
}
