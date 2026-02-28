'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { FileSearch, CheckCircle2, AlertTriangle, ArrowUpRight, ArrowDownRight } from 'lucide-react';

function formatPKR(n: number) {
    return new Intl.NumberFormat('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(n) || 0);
}

export default function ReconciliationClient({ wallets, initialTransactions }: { wallets: any[]; initialTransactions: any[] }) {
    const router = useRouter();
    const searchParams = useSearchParams();

    const defaultMonth = new Date().toISOString().slice(0, 7); // YYYY-MM

    const [walletId, setWalletId] = useState(searchParams.get('walletId') || '');
    const [month, setMonth] = useState(searchParams.get('month') || defaultMonth);
    const [actualBalanceStr, setActualBalanceStr] = useState('');

    // Update URL when filters change
    useEffect(() => {
        if (walletId) {
            router.push(`/finance/cash/reconciliation?walletId=${walletId}&month=${month}`);
        }
    }, [walletId, month, router]);

    const selectedWallet = wallets.find(w => w._id === walletId);
    const systemBalance = selectedWallet?.currentBalance || 0;
    const actualBalance = parseFloat(actualBalanceStr);
    const difference = isNaN(actualBalance) ? 0 : actualBalance - systemBalance;
    const isReconciled = !isNaN(actualBalance) && Math.abs(difference) < 0.01;

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Control Panel */}
            <div className="lg:col-span-1 border border-gray-100 bg-white rounded-2xl shadow-sm p-6 flex flex-col gap-6 h-fit">
                <h2 className="font-semibold text-gray-900 border-b border-gray-100 pb-3">Reconciliation Scope</h2>

                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">Select Account *</label>
                        <select
                            value={walletId}
                            onChange={e => setWalletId(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-leads-blue"
                        >
                            <option value="">-- Choose a Wallet --</option>
                            {wallets.map(w => (
                                <option key={w._id} value={w._id}>{w.name} ({w.type})</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">Period (Month)</label>
                        <input
                            type="month"
                            value={month}
                            onChange={e => setMonth(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-leads-blue"
                        />
                        <p className="text-[10px] text-gray-400 mt-1">Leave empty to see last 30 days.</p>
                    </div>
                </div>

                {selectedWallet && (
                    <div className="pt-4 border-t border-gray-100 space-y-4">
                        <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                            <p className="text-xs text-gray-500 font-medium mb-1">System Ledger Balance</p>
                            <p className="text-2xl font-bold text-gray-900">PKR {formatPKR(systemBalance)}</p>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1">Actual / Bank Statement Balance *</label>
                            <input
                                type="number"
                                step="any"
                                value={actualBalanceStr}
                                onChange={e => setActualBalanceStr(e.target.value)}
                                className="w-full px-3 py-2 border border-blue-200 bg-blue-50/50 rounded-lg text-base font-bold focus:ring-2 focus:ring-leads-blue"
                                placeholder="0"
                            />
                        </div>

                        {actualBalanceStr && (
                            <div className={`rounded-xl p-4 border ${isReconciled ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100'}`}>
                                <div className="flex items-center gap-2 mb-1">
                                    {isReconciled ? (
                                        <CheckCircle2 size={16} className="text-emerald-600" />
                                    ) : (
                                        <AlertTriangle size={16} className="text-rose-600" />
                                    )}
                                    <p className={`text-xs font-medium ${isReconciled ? 'text-emerald-700' : 'text-rose-700'}`}>
                                        Difference
                                    </p>
                                </div>
                                <p className={`text-xl font-bold ${isReconciled ? 'text-emerald-700' : 'text-rose-700'}`}>
                                    {difference === 0 ? 'Matched Perfectly' : `${difference > 0 ? '+' : '−'} PKR ${formatPKR(difference)}`}
                                </p>
                            </div>
                        )}

                        {/* Static Button since this is a reporting tool. We aren't doing any db writes. */}
                        <button
                            disabled={!isReconciled}
                            className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2 ${isReconciled
                                    ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm'
                                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                }`}
                        >
                            {isReconciled ? 'Reconciliation Completed' : 'Resolve Difference to Complete'}
                        </button>
                    </div>
                )}
            </div>

            {/* Transaction Review */}
            <div className="lg:col-span-2 border border-gray-100 bg-white rounded-2xl shadow-sm p-6">
                {!selectedWallet ? (
                    <div className="h-full flex flex-col items-center justify-center text-gray-400 py-12">
                        <FileSearch size={48} className="mb-4 opacity-20" />
                        <p>Select a wallet to review its transactions.</p>
                    </div>
                ) : (
                    <div>
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="font-semibold text-gray-900 border-b-2 border-leads-blue pb-1 inline-block">Ledger Entries</h2>
                            <span className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-md font-medium">
                                {initialTransactions.length} records found
                            </span>
                        </div>

                        {initialTransactions.length === 0 ? (
                            <p className="text-sm text-gray-500 py-8 text-center italic border border-dashed border-gray-200 rounded-xl bg-gray-50">
                                No transactions found for this period.
                            </p>
                        ) : (
                            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                                {initialTransactions.map((txn, index) => {
                                    // Determine inflow or outflow based on txType using a simple rule
                                    const isInflow = ['FEE_PAYMENT', 'SECURITY_DEPOSIT', 'INVESTMENT_RETURN', 'WALLET_TRANSFER_IN'].includes(txn.txType);

                                    return (
                                        <div key={txn._id || index} className="flex justify-between items-center py-3 px-4 rounded-xl border border-gray-50 bg-gray-50/50 hover:bg-gray-50 transition-colors group">
                                            <div className="flex gap-4 items-center">
                                                <div className={`p-2 rounded-lg ${isInflow ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                                                    {isInflow ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-semibold text-gray-900 capitalize leading-tight">
                                                        {txn.txType.replace(/_/g, ' ').toLowerCase()}
                                                    </p>
                                                    <p className="text-[11px] text-gray-500 mt-0.5">
                                                        {new Date(txn.date).toLocaleDateString()} &middot; {txn.notes || 'No note'}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className={`text-sm font-bold ${isInflow ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                    {isInflow ? '+' : '−'} {formatPKR(txn.amount)}
                                                </p>
                                                {/* <p className="text-[11px] text-gray-400 mt-0.5">Bal: PKR {formatPKR(txn.runningBalance || 0)}</p> */}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
