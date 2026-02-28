'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState } from 'react';
import { TrendingUp, Plus, Loader2, CheckCircle2, Clock } from 'lucide-react';

const STATUS_COLORS: Record<string, string> = {
    ACTIVE: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    MATURED: 'bg-indigo-50 text-indigo-700 border-indigo-100',
    WITHDRAWN: 'bg-rose-50 text-rose-700 border-rose-100',
};

const INV_TYPES = ['FIXED_DEPOSIT', 'SHORT_TERM', 'CAPITAL'];

export default function InvestmentsClient({ initialInvestments, wallets }: { initialInvestments: any[]; wallets: any[] }) {
    const [investments, setInvestments] = useState<any[]>(initialInvestments);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [form, setForm] = useState({
        name: '', type: 'FIXED_DEPOSIT', principalAmount: '', interestRate: '',
        startDate: new Date().toISOString().split('T')[0], maturityDate: '',
        sourceWalletId: '', expectedReturnAmount: '', notes: '',
    });

    const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true); setError('');
        try {
            const res = await fetch('/api/finance/investments', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...form,
                    principalAmount: parseFloat(form.principalAmount) || 0,
                    interestRate: parseFloat(form.interestRate) || undefined,
                    expectedReturnAmount: parseFloat(form.expectedReturnAmount) || undefined,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to record investment');
            setInvestments([data, ...investments]);
            setIsModalOpen(false);
        } catch (err: any) { setError(err.message); }
        finally { setLoading(false); }
    };

    const totalActive = investments.filter(i => i.status === 'ACTIVE').reduce((s, i) => s + i.principalAmount, 0);

    return (
        <div className="space-y-6">
            {/* KPI strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                    { label: 'Total Invested', value: `PKR ${totalActive.toLocaleString('en-PK')}`, color: 'text-indigo-600', bg: 'bg-indigo-50' },
                    { label: 'Active Placements', value: investments.filter(i => i.status === 'ACTIVE').length.toString(), color: 'text-emerald-600', bg: 'bg-emerald-50' },
                    { label: 'Matured', value: investments.filter(i => i.status === 'MATURED').length.toString(), color: 'text-gray-600', bg: 'bg-gray-100' },
                    { label: 'Withdrawn', value: investments.filter(i => i.status === 'WITHDRAWN').length.toString(), color: 'text-rose-600', bg: 'bg-rose-50' },
                ].map(k => (
                    <div key={k.label} className={`${k.bg} rounded-2xl p-4 border border-gray-100`}>
                        <p className={`text-xl font-bold ${k.color}`}>{k.value}</p>
                        <p className="text-xs text-gray-500 mt-1">{k.label}</p>
                    </div>
                ))}
            </div>

            {/* Table card */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-4 sm:p-6 border-b border-gray-100 flex items-center justify-between">
                    <h2 className="font-semibold text-gray-900">Investment Portfolio</h2>
                    <button onClick={() => setIsModalOpen(true)}
                        className="flex items-center gap-2 bg-leads-blue text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-800 transition-colors">
                        <Plus size={15} /> New Investment
                    </button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-gray-50 text-gray-500 text-xs font-semibold uppercase border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-3">Investment</th>
                                <th className="px-6 py-3">Type</th>
                                <th className="px-6 py-3 text-right">Principal</th>
                                <th className="px-6 py-3">Start</th>
                                <th className="px-6 py-3">Maturity</th>
                                <th className="px-6 py-3">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {investments.length === 0 ? (
                                <tr><td colSpan={6} className="py-16 text-center text-gray-400">
                                    <TrendingUp className="mx-auto mb-2 text-gray-200" size={32} />
                                    No investments recorded yet.
                                </td></tr>
                            ) : investments.map(inv => {
                                const daysToMaturity = inv.maturityDate ? Math.ceil((new Date(inv.maturityDate).getTime() - Date.now()) / 86400000) : null;
                                return (
                                    <tr key={inv._id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <p className="font-semibold text-gray-900">{inv.name}</p>
                                            <p className="text-xs font-mono text-gray-400">{inv.investmentNumber}</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded font-medium">{inv.type.replace(/_/g, ' ')}</span>
                                        </td>
                                        <td className="px-6 py-4 text-right font-mono font-bold text-gray-900">PKR {(inv.principalAmount || 0).toLocaleString('en-PK')}</td>
                                        <td className="px-6 py-4 text-xs text-gray-500">{new Date(inv.startDate).toLocaleDateString('en-PK', { dateStyle: 'medium' })}</td>
                                        <td className="px-6 py-4 text-xs text-gray-500">
                                            {inv.maturityDate ? (
                                                <span className="flex items-center gap-1">
                                                    <Clock size={11} className={daysToMaturity && daysToMaturity < 30 ? 'text-amber-500' : 'text-gray-300'} />
                                                    {new Date(inv.maturityDate).toLocaleDateString('en-PK', { dateStyle: 'medium' })}
                                                    {daysToMaturity !== null && daysToMaturity > 0 && <span className="text-gray-400">({daysToMaturity}d)</span>}
                                                </span>
                                            ) : '—'}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`text-xs px-2.5 py-1 rounded-full font-semibold border ${STATUS_COLORS[inv.status]}`}>{inv.status}</span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col">
                        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                            <h3 className="font-bold text-gray-900">Record New Investment</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600"><Plus size={20} className="rotate-45" /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
                            {error && <div className="p-3 bg-rose-50 text-rose-600 rounded-lg text-sm">{error}</div>}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="sm:col-span-2">
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">Investment Name *</label>
                                    <input required value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. HBL 6-Month Fixed Deposit"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-leads-blue" />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">Type *</label>
                                    <select required value={form.type} onChange={e => set('type', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-leads-blue">
                                        {INV_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">Principal (PKR) *</label>
                                    <input required type="number" min="1" value={form.principalAmount} onChange={e => set('principalAmount', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-leads-blue" />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">Start Date *</label>
                                    <input required type="date" value={form.startDate} onChange={e => set('startDate', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-leads-blue" />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">Maturity Date</label>
                                    <input type="date" value={form.maturityDate} onChange={e => set('maturityDate', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-leads-blue" />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">Interest Rate (%)</label>
                                    <input type="number" step="0.01" value={form.interestRate} onChange={e => set('interestRate', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-leads-blue" />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">Source Wallet *</label>
                                    <select required value={form.sourceWalletId} onChange={e => set('sourceWalletId', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-leads-blue">
                                        <option value="">-- Select --</option>
                                        {wallets.map(w => <option key={w._id} value={w._id}>{w.name} (PKR {(w.currentBalance || 0).toLocaleString('en-PK')})</option>)}
                                    </select>
                                </div>
                                <div className="sm:col-span-2">
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">Notes</label>
                                    <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none focus:ring-2 focus:ring-leads-blue" />
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg">Cancel</button>
                                <button type="submit" disabled={loading} className="px-5 py-2 text-sm font-bold text-white bg-leads-blue hover:bg-blue-800 rounded-lg flex items-center gap-2 disabled:opacity-50">
                                    {loading ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />} Record Investment
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
