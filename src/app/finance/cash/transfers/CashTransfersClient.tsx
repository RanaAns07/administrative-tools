'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState } from 'react';
import { ArrowRightLeft, Loader2, CheckCircle2 } from 'lucide-react';

export default function CashTransfersClient({ wallets }: { wallets: any[] }) {
    const [form, setForm] = useState({ fromWalletId: '', toWalletId: '', amount: '', date: new Date().toISOString().split('T')[0], notes: '' });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (form.fromWalletId === form.toWalletId) { setError('Source and destination wallets must be different.'); return; }
        setLoading(true); setError(''); setSuccess('');
        try {
            const res = await fetch('/api/finance/wallet-transfers', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...form, amount: parseFloat(form.amount) }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Transfer failed');
            setSuccess(`Transfer of PKR ${parseFloat(form.amount).toLocaleString('en-PK')} recorded successfully.`);
            setForm(f => ({ ...f, amount: '', notes: '' }));
        } catch (err: any) { setError(err.message); }
        finally { setLoading(false); }
    };

    const fromWallet = wallets.find(w => w._id === form.fromWalletId);
    const toWallet = wallets.find(w => w._id === form.toWalletId);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Form */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-indigo-50 rounded-xl">
                        <ArrowRightLeft size={18} className="text-indigo-600" />
                    </div>
                    <h2 className="font-semibold text-gray-900">New Transfer</h2>
                </div>

                {error && <div className="mb-4 p-3 bg-rose-50 text-rose-700 rounded-lg text-sm border border-rose-100">{error}</div>}
                {success && (
                    <div className="mb-4 p-3 bg-emerald-50 text-emerald-700 rounded-lg text-sm border border-emerald-100 flex items-center gap-2">
                        <CheckCircle2 size={16} /> {success}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">Transfer From *</label>
                        <select required value={form.fromWalletId} onChange={e => set('fromWalletId', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-leads-blue">
                            <option value="">-- Select source wallet --</option>
                            {wallets.map(w => <option key={w._id} value={w._id}>{w.name} (PKR {(w.currentBalance || 0).toLocaleString('en-PK')})</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">Transfer To *</label>
                        <select required value={form.toWalletId} onChange={e => set('toWalletId', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-leads-blue">
                            <option value="">-- Select destination wallet --</option>
                            {wallets.filter(w => w._id !== form.fromWalletId).map(w => <option key={w._id} value={w._id}>{w.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">Amount (PKR) *</label>
                        <input required type="number" min="1" step="0.01" value={form.amount} onChange={e => set('amount', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-leads-blue" placeholder="0" />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">Date *</label>
                        <input required type="date" value={form.date} onChange={e => set('date', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-leads-blue" />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">Notes</label>
                        <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-leads-blue resize-none"
                            placeholder="Optional memo..." />
                    </div>

                    <button type="submit" disabled={loading}
                        className="w-full py-2.5 bg-leads-blue text-white font-semibold rounded-xl text-sm hover:bg-blue-800 transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
                        {loading ? <Loader2 size={16} className="animate-spin" /> : <ArrowRightLeft size={16} />}
                        {loading ? 'Processing…' : 'Execute Transfer'}
                    </button>
                </form>
            </div>

            {/* Summary panel */}
            <div className="lg:col-span-3 flex flex-col gap-4">
                {/* Preview */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                    <h3 className="font-semibold text-gray-900 mb-4">Transfer Preview</h3>
                    {!form.fromWalletId && !form.toWalletId ? (
                        <p className="text-sm text-gray-400 py-4 text-center">Select source and destination wallets to preview.</p>
                    ) : (
                        <div className="flex items-center justify-between gap-4 flex-wrap">
                            <div className="flex-1 min-w-[140px] p-4 bg-rose-50 rounded-xl border border-rose-100">
                                <p className="text-xs text-rose-500 font-medium mb-1">Debit From</p>
                                <p className="font-bold text-rose-700">{fromWallet?.name || '—'}</p>
                                <p className="text-xs text-rose-400 mt-1">Balance: PKR {(fromWallet?.currentBalance || 0).toLocaleString('en-PK')}</p>
                            </div>
                            <ArrowRightLeft size={24} className="text-gray-300 flex-shrink-0" />
                            <div className="flex-1 min-w-[140px] p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                                <p className="text-xs text-emerald-500 font-medium mb-1">Credit To</p>
                                <p className="font-bold text-emerald-700">{toWallet?.name || '—'}</p>
                                <p className="text-xs text-emerald-400 mt-1">Balance: PKR {(toWallet?.currentBalance || 0).toLocaleString('en-PK')}</p>
                            </div>
                        </div>
                    )}
                    {form.amount && (
                        <div className="mt-4 pt-4 border-t border-gray-100 text-center">
                            <p className="text-xs text-gray-400 mb-1">Transfer amount</p>
                            <p className="text-2xl font-bold text-gray-900">PKR {parseFloat(form.amount || '0').toLocaleString('en-PK')}</p>
                        </div>
                    )}
                </div>

                {/* Wallet list */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                    <h3 className="font-semibold text-gray-900 mb-4">All Active Wallets</h3>
                    <div className="space-y-2">
                        {wallets.map(w => (
                            <div key={w._id} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
                                <div>
                                    <p className="text-sm font-medium text-gray-800">{w.name}</p>
                                    <p className="text-xs text-gray-400">{w.walletType}</p>
                                </div>
                                <p className="font-mono text-sm font-bold text-gray-900">PKR {(w.currentBalance || 0).toLocaleString('en-PK')}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
