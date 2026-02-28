'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    TrendingUp, TrendingDown, ArrowUpRight,
    Calendar, CircleDollarSign, CheckCircle2,
    X, Loader2, Download, AlertTriangle
} from 'lucide-react';

function formatPKR(n: number) {
    return new Intl.NumberFormat('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n || 0);
}

export default function InvestmentReturnsClient({
    initialInvestments, wallets
}: {
    initialInvestments: any[]; wallets: any[]
}) {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<'ACTIVE' | 'MATURED'>('ACTIVE');

    // Modal State
    const [selectedInv, setSelectedInv] = useState<any | null>(null);
    const [actionType, setActionType] = useState<'RECORD_RETURN' | 'WITHDRAWN' | null>(null);
    const [form, setForm] = useState({ actualReturnAmount: '', returnWalletId: wallets[0]?._id || '', date: '', notes: '' });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const investments = initialInvestments.filter(inv => inv.status === activeTab);

    const openModal = (inv: any, type: 'RECORD_RETURN' | 'WITHDRAWN') => {
        setSelectedInv(inv);
        setActionType(type);
        setForm({
            actualReturnAmount: inv.expectedReturnAmount?.toString() || inv.principalAmount?.toString() || '',
            returnWalletId: wallets[0]?._id || '',
            date: new Date().toISOString().split('T')[0],
            notes: type === 'WITHDRAWN' ? 'Early withdrawal' : `Maturity return for ${inv.name}`
        });
        setError('');
    };

    const closeModal = () => {
        setSelectedInv(null);
        setActionType(null);
        setError('');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        const payload: any = {
            id: selectedInv._id,
            action: actionType === 'RECORD_RETURN' ? 'RECORD_RETURN' : 'MARK_WITHDRAWN',
            notes: form.notes,
        };

        if (actionType === 'RECORD_RETURN') {
            payload.actualReturnAmount = parseFloat(form.actualReturnAmount);
            payload.returnWalletId = form.returnWalletId;
            payload.date = form.date;
        }

        try {
            const res = await fetch('/api/finance/investments', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to process request');

            closeModal();
            router.refresh();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">

            {/* Summary Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-white border text-center border-gray-100 rounded-2xl p-5 shadow-sm flex flex-col justify-center">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center justify-center gap-2">
                        <TrendingUp size={16} className="text-indigo-500" /> Pending Returns (Active)
                    </p>
                    <p className="text-3xl font-bold text-gray-900">
                        {initialInvestments.filter(i => i.status === 'ACTIVE').length}
                    </p>
                    <p className="text-xs text-gray-400 mt-2">Investments waiting for maturity</p>
                </div>
                <div className="bg-emerald-50 text-center border border-emerald-100 rounded-2xl p-5 shadow-sm flex flex-col justify-center">
                    <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider mb-2 flex items-center justify-center gap-2">
                        <CheckCircle2 size={16} /> Returns Realized (Matured)
                    </p>
                    <p className="text-3xl font-bold text-emerald-700">
                        PKR {formatPKR(initialInvestments.filter(i => i.status === 'MATURED').reduce((sum, i) => sum + (i.actualReturnAmount || 0), 0))}
                    </p>
                    <p className="text-xs text-emerald-600/70 mt-2">Total cash received from {initialInvestments.filter(i => i.status === 'MATURED').length} matured placements</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-200">
                <button
                    onClick={() => setActiveTab('ACTIVE')}
                    className={`px-6 py-3 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'ACTIVE' ? 'border-leads-blue text-leads-blue' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                >
                    Awaiting Return
                </button>
                <button
                    onClick={() => setActiveTab('MATURED')}
                    className={`px-6 py-3 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'MATURED' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                >
                    Matured & Received
                </button>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50/50 border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-4 font-semibold text-gray-500">Investment</th>
                                <th className="px-6 py-4 font-semibold text-gray-500">Principal</th>
                                <th className="px-6 py-4 font-semibold text-gray-500">Expected / Actual Return</th>
                                <th className="px-6 py-4 font-semibold text-gray-500">Maturity Date</th>
                                <th className="px-6 py-4 font-semibold text-gray-500 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {investments.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                                        No investments found in this category.
                                    </td>
                                </tr>
                            ) : (
                                investments.map((inv) => (
                                    <tr key={inv._id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <p className="font-semibold text-gray-900">{inv.name}</p>
                                            <p className="text-[11px] text-gray-500 mt-0.5">{inv.investmentNumber} · {inv.type.replace('_', ' ')}</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="font-mono font-medium text-gray-900">PKR {formatPKR(inv.principalAmount)}</p>
                                            <p className="text-[11px] text-gray-400 mt-0.5 mt-1">From: {inv.sourceWalletId?.name || 'Unknown'}</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            {activeTab === 'MATURED' ? (
                                                <div>
                                                    <p className="font-mono font-bold text-emerald-600">PKR {formatPKR(inv.actualReturnAmount)}</p>
                                                    <p className="text-[11px] text-gray-400 mt-1">To: {inv.returnWalletId?.name || 'Unknown'}</p>
                                                </div>
                                            ) : (
                                                <p className="font-mono text-gray-600">{inv.expectedReturnAmount ? `PKR ${formatPKR(inv.expectedReturnAmount)}` : 'N/A'}</p>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2 text-gray-600">
                                                <Calendar size={14} className="text-gray-400" />
                                                <span>{inv.maturityDate ? new Date(inv.maturityDate).toLocaleDateString() : 'Open-ended'}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            {activeTab === 'ACTIVE' && (
                                                <div className="flex justify-end gap-2">
                                                    <button
                                                        onClick={() => openModal(inv, 'RECORD_RETURN')}
                                                        className="px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5"
                                                    >
                                                        <Download size={14} /> Record Return
                                                    </button>
                                                    <button
                                                        onClick={() => openModal(inv, 'WITHDRAWN')}
                                                        className="px-3 py-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5"
                                                        title="Early Withdrawal / Cancel"
                                                    >
                                                        <AlertTriangle size={14} /> Withdraw
                                                    </button>
                                                </div>
                                            )}
                                            {activeTab === 'MATURED' && (
                                                <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
                                                    <CheckCircle2 size={12} /> Realized
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal */}
            {selectedInv && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
                        <div className="flex justify-between items-center p-5 border-b border-gray-100 bg-gray-50/50">
                            <h2 className="font-bold text-gray-900 flex items-center gap-2">
                                {actionType === 'RECORD_RETURN' ? (
                                    <><Download size={18} className="text-emerald-600" /> Record Return</>
                                ) : (
                                    <><AlertTriangle size={18} className="text-rose-600" /> Early Withdrawal</>
                                )}
                            </h2>
                            <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-5">
                            <div className="mb-5 p-4 rounded-xl bg-gray-50 border border-gray-100 text-sm">
                                <p className="font-semibold text-gray-900 mb-1">{selectedInv.name}</p>
                                <div className="flex justify-between text-gray-500 mt-2 text-xs">
                                    <span>Principal: PKR {formatPKR(selectedInv.principalAmount)}</span>
                                    <span>Expected: PKR {formatPKR(selectedInv.expectedReturnAmount || 0)}</span>
                                </div>
                            </div>

                            {error && (
                                <div className="mb-5 p-3 rounded-lg bg-rose-50 border border-rose-100 text-rose-600 text-sm">
                                    {error}
                                </div>
                            )}

                            <form onSubmit={handleSubmit} className="space-y-4">
                                {actionType === 'RECORD_RETURN' && (
                                    <>
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-700 mb-1">Actual Return Amount (PKR) *</label>
                                            <div className="relative">
                                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                    <CircleDollarSign size={16} className="text-gray-400" />
                                                </div>
                                                <input
                                                    type="number" min="0" step="0.01" required
                                                    value={form.actualReturnAmount}
                                                    onChange={e => setForm({ ...form, actualReturnAmount: e.target.value })}
                                                    className="w-full pl-10 pr-3 py-2 border border-blue-200 bg-blue-50/30 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-leads-blue"
                                                />
                                            </div>
                                            <p className="text-[10px] text-gray-500 mt-1">Include total payout (Principal + Profit).</p>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-700 mb-1">Deposit To Wallet *</label>
                                            <select
                                                required
                                                value={form.returnWalletId}
                                                onChange={e => setForm({ ...form, returnWalletId: e.target.value })}
                                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-leads-blue"
                                            >
                                                {wallets.map(w => (
                                                    <option key={w._id} value={w._id}>{w.name} ({w.type})</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-700 mb-1">Date *</label>
                                            <input
                                                type="date" required
                                                value={form.date}
                                                onChange={e => setForm({ ...form, date: e.target.value })}
                                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-leads-blue"
                                            />
                                        </div>
                                    </>
                                )}

                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">Notes</label>
                                    <textarea
                                        value={form.notes}
                                        onChange={e => setForm({ ...form, notes: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-leads-blue resize-none"
                                        rows={2} placeholder="Optional details..."
                                    />
                                </div>

                                <div className="pt-2 flex gap-3">
                                    <button
                                        type="button" onClick={closeModal}
                                        className="flex-1 py-2 rounded-xl text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit" disabled={loading}
                                        className={`flex-1 py-2 rounded-xl text-sm font-semibold text-white transition-colors flex justify-center items-center gap-2 ${actionType === 'RECORD_RETURN'
                                                ? 'bg-emerald-600 hover:bg-emerald-700'
                                                : 'bg-rose-600 hover:bg-rose-700'
                                            }`}
                                    >
                                        {loading ? <Loader2 size={16} className="animate-spin" /> : null}
                                        {actionType === 'RECORD_RETURN' ? 'Submit Return' : 'Confirm Withdrawal'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}
