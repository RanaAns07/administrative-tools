'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { BarChart2, Download, RefreshCw, Check, X, Loader2 } from 'lucide-react';

interface TBLine {
    accountCode: string;
    accountName: string;
    accountType: string;
    debitBalance: number;
    creditBalance: number;
}

interface TBData {
    trialBalance: TBLine[];
    grandTotalDebit: number;
    grandTotalCredit: number;
    isBalanced: boolean;
    generatedAt: string;
}

const typeColors: Record<string, string> = {
    ASSET: 'text-blue-700', LIABILITY: 'text-orange-700',
    EQUITY: 'text-purple-700', REVENUE: 'text-green-700', EXPENSE: 'text-red-700',
};

export default function TrialBalancePage() {
    const [data, setData] = useState<TBData | null>(null);
    const [loading, setLoading] = useState(false);
    const [from, setFrom] = useState('');
    const [to, setTo] = useState(new Date().toISOString().split('T')[0]);

    const load = () => {
        setLoading(true);
        const qs = new URLSearchParams();
        if (from) qs.set('from', from);
        if (to) qs.set('to', to);
        fetch(`/api/finance/trial-balance?${qs}`)
            .then((r) => r.json())
            .then(setData)
            .catch(console.error)
            .finally(() => setLoading(false));
    };

    const exportCSV = () => {
        if (!data) return;
        const rows = [
            ['Account Code', 'Account Name', 'Type', 'Debit Balance', 'Credit Balance'],
            ...data.trialBalance.map((l) => [l.accountCode, l.accountName, l.accountType, l.debitBalance, l.creditBalance]),
            [],
            ['', 'TOTAL', '', data.grandTotalDebit, data.grandTotalCredit],
        ];
        const csv = rows.map((r) => r.join(',')).join('\n');
        const a = document.createElement('a');
        a.href = `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`;
        a.download = `trial-balance-${to}.csv`;
        a.click();
    };

    return (
        <div className="space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h1 className="text-xl font-bold text-leads-blue flex items-center gap-2"><BarChart2 size={22} /> Trial Balance</h1>
                    <p className="text-xs text-gray-500 mt-0.5">Debit and credit balances from posted journal entries</p>
                </div>
                <div className="flex gap-2">
                    {data && (
                        <button onClick={exportCSV}
                            className="flex items-center gap-2 border border-gray-200 bg-white text-gray-700 px-3 py-2 rounded-lg text-sm hover:bg-gray-50 transition-colors">
                            <Download size={15} /> CSV
                        </button>
                    )}
                </div>
            </div>

            {/* Controls */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap gap-3 items-end">
                <div>
                    <label className="text-xs font-semibold text-gray-600 mb-1 block">From Date</label>
                    <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
                        className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-leads-blue" />
                </div>
                <div>
                    <label className="text-xs font-semibold text-gray-600 mb-1 block">To Date</label>
                    <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
                        className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-leads-blue" />
                </div>
                <button onClick={load} disabled={loading}
                    className="flex items-center gap-2 bg-leads-blue text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-800 transition-colors">
                    {loading ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
                    Generate
                </button>
                {data && (
                    <div className={`flex items-center gap-1.5 text-sm font-semibold px-3 py-2 rounded-lg ${data.isBalanced ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                        {data.isBalanced ? <Check size={15} /> : <X size={15} />}
                        {data.isBalanced ? 'Balanced' : 'IMBALANCED'}
                    </div>
                )}
            </div>

            {data && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 border-b border-gray-100 text-xs uppercase text-gray-500 font-semibold tracking-wider">
                                <tr>
                                    <th className="px-4 py-3">Code</th>
                                    <th className="px-4 py-3">Account Name</th>
                                    <th className="px-4 py-3">Type</th>
                                    <th className="px-4 py-3 text-right">Debit (PKR)</th>
                                    <th className="px-4 py-3 text-right">Credit (PKR)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {data.trialBalance.map((l, i) => (
                                    <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-4 py-2.5 font-mono text-xs font-semibold text-leads-blue">{l.accountCode}</td>
                                        <td className="px-4 py-2.5 text-sm text-gray-800">{l.accountName}</td>
                                        <td className={`px-4 py-2.5 text-xs font-medium ${typeColors[l.accountType]}`}>{l.accountType}</td>
                                        <td className="px-4 py-2.5 text-right font-mono text-sm">
                                            {l.debitBalance > 0 ? l.debitBalance.toLocaleString('en-PK', { minimumFractionDigits: 2 }) : '—'}
                                        </td>
                                        <td className="px-4 py-2.5 text-right font-mono text-sm">
                                            {l.creditBalance > 0 ? l.creditBalance.toLocaleString('en-PK', { minimumFractionDigits: 2 }) : '—'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot className="bg-leads-blue text-white">
                                <tr>
                                    <td colSpan={3} className="px-4 py-3 font-bold text-sm">GRAND TOTAL</td>
                                    <td className="px-4 py-3 text-right font-bold font-mono">{data.grandTotalDebit.toLocaleString('en-PK', { minimumFractionDigits: 2 })}</td>
                                    <td className="px-4 py-3 text-right font-bold font-mono">{data.grandTotalCredit.toLocaleString('en-PK', { minimumFractionDigits: 2 })}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                    <div className="px-4 py-3 bg-gray-50 text-xs text-gray-400 border-t border-gray-100">
                        Generated: {new Date(data.generatedAt).toLocaleString('en-PK')}
                    </div>
                </motion.div>
            )}

            {!data && !loading && (
                <div className="bg-white rounded-xl border border-gray-200 py-16 text-center text-gray-400">
                    <BarChart2 size={40} className="mx-auto mb-3 opacity-30" />
                    <p className="text-sm">Select a date range and click Generate to view the trial balance.</p>
                </div>
            )}
        </div>
    );
}
