'use client';
import { useState } from 'react';
import { TrendingDown, RefreshCw, Loader2 } from 'lucide-react';

interface ISData { revenues: any[]; expenses: any[]; totalRevenue: number; totalExpenses: number; netIncome: number; period: { from?: string; to: string }; }

export default function IncomeStatementPage() {
    const [data, setData] = useState<ISData | null>(null);
    const [loading, setLoading] = useState(false);
    const [from, setFrom] = useState('');
    const [to, setTo] = useState(new Date().toISOString().split('T')[0]);

    const load = () => {
        setLoading(true);
        const qs = new URLSearchParams(); if (from) qs.set('from', from); qs.set('to', to);
        fetch(`/api/finance/reports/income-statement?${qs}`).then(r => r.json()).then(setData).finally(() => setLoading(false));
    };

    const Section = ({ title, items, total, colorClass }: { title: string; items: any[]; total: number; colorClass: string }) => (
        <div className="mb-6">
            <h3 className={`text-xs font-bold uppercase tracking-wider mb-2 ${colorClass}`}>{title}</h3>
            {items.map((a, i) => (
                <div key={i} className="flex justify-between text-sm py-1.5 border-b border-gray-50">
                    <span className="text-gray-700">{a.accountCode} – {a.accountName}</span>
                    <span className="font-mono text-gray-800">{a.amount.toLocaleString('en-PK', { minimumFractionDigits: 2 })}</span>
                </div>
            ))}
            <div className={`flex justify-between text-sm font-bold pt-2 ${colorClass}`}>
                <span>Total {title}</span><span className="font-mono">{total.toLocaleString('en-PK', { minimumFractionDigits: 2 })}</span>
            </div>
        </div>
    );

    return (
        <div className="space-y-5">
            <h1 className="text-xl font-bold text-leads-blue flex items-center gap-2"><TrendingDown size={22} /> Income Statement</h1>
            <div className="bg-white rounded-xl border border-gray-200 p-4 flex gap-3 items-end flex-wrap">
                <div><label className="text-xs font-semibold text-gray-600 mb-1 block">From</label>
                    <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-leads-blue" /></div>
                <div><label className="text-xs font-semibold text-gray-600 mb-1 block">To</label>
                    <input type="date" value={to} onChange={e => setTo(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-leads-blue" /></div>
                <button onClick={load} disabled={loading} className="flex items-center gap-2 bg-leads-blue text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-800">
                    {loading ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />} Generate
                </button>
            </div>
            {data && (
                <div className="bg-white rounded-xl border border-gray-200 p-6 max-w-2xl">
                    <Section title="Revenues" items={data.revenues} total={data.totalRevenue} colorClass="text-green-700" />
                    <Section title="Expenses" items={data.expenses} total={data.totalExpenses} colorClass="text-red-700" />
                    <div className={`flex justify-between text-base font-bold pt-3 border-t-2 ${data.netIncome >= 0 ? 'text-green-700 border-green-200' : 'text-red-700 border-red-200'}`}>
                        <span>{data.netIncome >= 0 ? 'Net Income (Surplus)' : 'Net Loss (Deficit)'}</span>
                        <span className="font-mono">{data.netIncome.toLocaleString('en-PK', { minimumFractionDigits: 2 })}</span>
                    </div>
                </div>
            )}
            {!data && !loading && (
                <div className="bg-white rounded-xl border border-gray-200 py-16 text-center text-gray-400">
                    <TrendingDown size={40} className="mx-auto mb-3 opacity-30" /><p className="text-sm">Select a period and click Generate.</p>
                </div>
            )}
        </div>
    );
}
