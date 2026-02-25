'use client';
import { useState } from 'react';
import { Scale, Download, RefreshCw, Loader2 } from 'lucide-react';

interface BSData { assets: any[]; liabilities: any[]; equity: any[]; totalAssets: number; totalLiabilities: number; totalEquity: number; isBalanced: boolean; asOf: string; }

export default function BalanceSheetPage() {
    const [data, setData] = useState<BSData | null>(null);
    const [loading, setLoading] = useState(false);
    const [asOf, setAsOf] = useState(new Date().toISOString().split('T')[0]);

    const load = () => {
        setLoading(true);
        fetch(`/api/finance/reports/balance-sheet?asOf=${asOf}`)
            .then(r => r.json()).then(setData).finally(() => setLoading(false));
    };

    const Section = ({ title, items, total, colorClass }: { title: string; items: any[]; total: number; colorClass: string }) => (
        <div className="mb-6">
            <h3 className={`text-xs font-bold uppercase tracking-wider mb-2 ${colorClass}`}>{title}</h3>
            {items.map((a, i) => (
                <div key={i} className="flex justify-between text-sm py-1 border-b border-gray-50">
                    <span className="text-gray-700">{a.accountCode} – {a.accountName}</span>
                    <span className="font-mono text-gray-800">{a.amount.toLocaleString('en-PK', { minimumFractionDigits: 2 })}</span>
                </div>
            ))}
            <div className={`flex justify-between text-sm font-bold pt-2 ${colorClass}`}>
                <span>Total {title}</span>
                <span className="font-mono">{total.toLocaleString('en-PK', { minimumFractionDigits: 2 })}</span>
            </div>
        </div>
    );

    return (
        <div className="space-y-5">
            <div className="flex items-center justify-between"><h1 className="text-xl font-bold text-leads-blue flex items-center gap-2"><Scale size={22} /> Balance Sheet</h1></div>
            <div className="bg-white rounded-xl border border-gray-200 p-4 flex gap-3 items-end flex-wrap">
                <div><label className="text-xs font-semibold text-gray-600 mb-1 block">As of Date</label>
                    <input type="date" value={asOf} onChange={e => setAsOf(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-leads-blue" /></div>
                <button onClick={load} disabled={loading} className="flex items-center gap-2 bg-leads-blue text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-800">
                    {loading ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />} Generate
                </button>
            </div>
            {data && (
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div><Section title="Assets" items={data.assets} total={data.totalAssets} colorClass="text-blue-700" /></div>
                        <div>
                            <Section title="Liabilities" items={data.liabilities} total={data.totalLiabilities} colorClass="text-orange-700" />
                            <Section title="Equity" items={data.equity} total={data.totalEquity} colorClass="text-purple-700" />
                            <div className={`flex justify-between text-sm font-bold pt-2 mt-2 border-t-2 ${data.isBalanced ? 'text-green-700 border-green-200' : 'text-red-700 border-red-200'}`}>
                                <span>Liabilities + Equity</span>
                                <span className="font-mono">{(data.totalLiabilities + data.totalEquity).toLocaleString('en-PK', { minimumFractionDigits: 2 })}</span>
                            </div>
                        </div>
                    </div>
                    <p className={`text-xs mt-4 font-semibold ${data.isBalanced ? 'text-green-600' : 'text-red-600'}`}>
                        {data.isBalanced ? '✓ Balance Sheet is balanced (Assets = Liabilities + Equity)' : '✗ IMBALANCED — check journal entries'}
                    </p>
                </div>
            )}
            {!data && !loading && (
                <div className="bg-white rounded-xl border border-gray-200 py-16 text-center text-gray-400">
                    <Scale size={40} className="mx-auto mb-3 opacity-30" /><p className="text-sm">Select a date and click Generate.</p>
                </div>
            )}
        </div>
    );
}
