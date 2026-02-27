/* eslint-disable @typescript-eslint/no-explicit-any */
import dbConnect from '@/lib/mongodb';
import Transaction from '@/models/finance/Transaction';
import { ArrowUpRight, ArrowDownRight, ArrowRightLeft, Activity } from 'lucide-react';

import TransactionTable from './TransactionTable';

function formatPKR(n: number) {
    return new Intl.NumberFormat('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
}

async function getTransactions() {
    await dbConnect();
    const txns = await Transaction
        .find({})
        .sort({ date: -1 })
        .limit(100)
        .populate('walletId', 'name type')
        .populate('categoryId', 'name type')
        .lean();
    return JSON.parse(JSON.stringify(txns));
}

export default async function TransactionsPage() {
    const txns = await getTransactions();

    const totalIn = txns.filter((t: any) => t.type === 'IN').reduce((s: number, t: any) => s + t.amount, 0);
    const totalOut = txns.filter((t: any) => t.type === 'OUT').reduce((s: number, t: any) => s + t.amount, 0);

    return (
        <div className="space-y-6 max-w-[1200px]">

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <span className="text-xs font-semibold text-leads-blue uppercase tracking-widest">Khatta Engine</span>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight mt-0.5">Transactions</h1>
                    <p className="text-sm text-gray-400">Last {txns.length} money movements</p>
                </div>
                <span className="flex items-center gap-1.5 text-xs bg-gray-50 border border-gray-100 text-gray-500 px-3 py-1.5 rounded-full">
                    <Activity size={11} /> Live
                </span>
            </div>

            {/* Summary strip */}
            <div className="grid grid-cols-3 gap-4">
                <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <ArrowUpRight size={15} className="text-emerald-600" />
                        <p className="text-xs font-medium text-emerald-700">Total In (shown)</p>
                    </div>
                    <p className="text-xl font-bold text-emerald-700">PKR {formatPKR(totalIn)}</p>
                </div>
                <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <ArrowDownRight size={15} className="text-rose-600" />
                        <p className="text-xs font-medium text-rose-700">Total Out (shown)</p>
                    </div>
                    <p className="text-xl font-bold text-rose-700">PKR {formatPKR(totalOut)}</p>
                </div>
                <div className={`border rounded-2xl p-4 ${totalIn - totalOut >= 0 ? 'bg-indigo-50 border-indigo-100' : 'bg-rose-50 border-rose-100'}`}>
                    <div className="flex items-center gap-2 mb-2">
                        <ArrowRightLeft size={15} className={totalIn - totalOut >= 0 ? 'text-indigo-600' : 'text-rose-600'} />
                        <p className={`text-xs font-medium ${totalIn - totalOut >= 0 ? 'text-indigo-700' : 'text-rose-700'}`}>Net</p>
                    </div>
                    <p className={`text-xl font-bold ${totalIn - totalOut >= 0 ? 'text-indigo-700' : 'text-rose-700'}`}>
                        {totalIn - totalOut >= 0 ? '+' : '−'} PKR {formatPKR(Math.abs(totalIn - totalOut))}
                    </p>
                </div>
            </div>

            {/* Table */}
            <TransactionTable txns={txns} />
        </div>
    );
}
