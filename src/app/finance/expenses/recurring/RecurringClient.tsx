'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, X, Loader2, Check, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import RoleGuard from '../../_components/RoleGuard';

function formatPKR(n: number) {
    return new Intl.NumberFormat('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
}

export default function RecurringClient({ initialData, categories, wallets, vendors }: { initialData: any[], categories: any[], wallets: any[], vendors: any[] }) {
    const [templates, setTemplates] = useState(initialData);
    const [isOpen, setIsOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    const [form, setForm] = useState({
        title: '',
        amount: '',
        dayOfMonth: 1,
        categoryId: categories[0]?._id || '',
        walletId: wallets[0]?._id || '',
        vendorId: '',
        department: '',
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError(null);

        try {
            const res = await fetch('/api/finance/expenses/recurring', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...form,
                    amount: Number(form.amount),
                    dayOfMonth: Number(form.dayOfMonth),
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to create template');

            setIsOpen(false);
            setForm({
                title: '',
                amount: '',
                dayOfMonth: 1,
                categoryId: categories[0]?._id || '',
                walletId: wallets[0]?._id || '',
                vendorId: '',
                department: '',
            });
            router.refresh();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-6 max-w-[1100px] flex flex-col min-h-full">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <span className="text-xs font-semibold text-leads-blue uppercase tracking-widest">Money Out</span>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight mt-0.5">Recurring Expenses</h1>
                    <p className="text-sm text-gray-400">Manage monthly expense templates (e.g., Internet, Electricity)</p>
                </div>
                <RoleGuard>
                    <button
                        onClick={() => setIsOpen(true)}
                        className="inline-flex items-center gap-2 bg-leads-blue text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-leads-blue/90 transition-colors shadow-sm"
                    >
                        <Plus size={15} /> New Template
                    </button>
                </RoleGuard>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden border-b-0">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                    <h2 className="font-semibold text-gray-900 text-sm flex items-center gap-2">
                        <RefreshCw size={15} className="text-gray-400" />
                        Active Templates
                    </h2>
                    <span className="text-xs text-gray-400">{templates.length} templates</span>
                </div>

                {templates.length === 0 ? (
                    <div className="py-20 text-center border-b border-gray-100">
                        <RefreshCw size={36} className="text-gray-200 mx-auto mb-3" />
                        <p className="text-gray-500 font-medium">No recurring templates setup</p>
                        <p className="text-sm text-gray-400 mt-1">Add a template such as rent or utility bills.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto border-b border-gray-100">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-100">
                                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Day</th>
                                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Title</th>
                                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Category</th>
                                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Vendor</th>
                                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">From Wallet</th>
                                    <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Amount</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {templates.map(tmp => (
                                    <tr key={tmp._id} className="hover:bg-gray-50/60 transition-colors group">
                                        <td className="px-5 py-3.5 text-gray-500 text-xs whitespace-nowrap">
                                            {tmp.dayOfMonth}
                                        </td>
                                        <td className="px-5 py-3.5 max-w-[240px]">
                                            <p className="text-gray-800 font-medium truncate flex items-center gap-2">
                                                {tmp.title}
                                                {!tmp.isActive && <span className="text-[10px] bg-red-100 text-red-600 px-1.5 rounded bg-gray-100">Inactive</span>}
                                            </p>
                                            {tmp.department && (
                                                <p className="text-xs text-gray-400 truncate mt-0.5">{tmp.department}</p>
                                            )}
                                        </td>
                                        <td className="px-5 py-3.5">
                                            {tmp.categoryId ? (
                                                <span className="text-xs text-rose-700 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded-full">
                                                    {(tmp.categoryId as any).name}
                                                </span>
                                            ) : (
                                                <span className="text-xs text-gray-300">—</span>
                                            )}
                                        </td>
                                        <td className="px-5 py-3.5">
                                            <p className="text-xs text-gray-600 font-medium">
                                                {tmp.vendorId ? (tmp.vendorId as any).name : '—'}
                                            </p>
                                        </td>
                                        <td className="px-5 py-3.5">
                                            <p className="text-xs text-gray-600 font-medium">
                                                {tmp.walletId ? (tmp.walletId as any).name : '—'}
                                            </p>
                                        </td>
                                        <td className="px-5 py-3.5 text-right whitespace-nowrap">
                                            <span className="font-bold text-rose-600">
                                                PKR {formatPKR(tmp.amount)} / mo
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <AnimatePresence>
                {isOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm overflow-y-auto">
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 my-4"
                        >
                            <div className="flex justify-between items-center mb-5 border-b border-gray-100 pb-3">
                                <h2 className="font-bold text-lg text-rose-600">New Recurring Template</h2>
                                <button type="button" onClick={() => setIsOpen(false)}><X size={18} className="text-gray-400 hover:text-gray-600" /></button>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="text-xs font-semibold text-gray-600 mb-1 block">Title *</label>
                                    <input required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
                                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-rose-500 transition-shadow"
                                        placeholder="e.g. Internet Bill" />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-xs font-semibold text-gray-600 mb-1 block">Amount (PKR) *</label>
                                        <input required type="number" step="0.01" min="1" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })}
                                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-rose-500 font-medium"
                                            placeholder="5000" />
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold text-gray-600 mb-1 block">Day of Month *</label>
                                        <input required type="number" min="1" max="28" value={form.dayOfMonth} onChange={e => setForm({ ...form, dayOfMonth: Number(e.target.value) })}
                                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-rose-500" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-xs font-semibold text-gray-600 mb-1 block">Paying Wallet *</label>
                                        <select required value={form.walletId} onChange={e => setForm({ ...form, walletId: e.target.value })}
                                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-rose-500 bg-white">
                                            {wallets.map(w => <option key={w._id} value={w._id}>{w.name}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold text-gray-600 mb-1 block">Category *</label>
                                        <select required value={form.categoryId} onChange={e => setForm({ ...form, categoryId: e.target.value })}
                                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-rose-500 bg-white">
                                            {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-gray-600 mb-1 block">Vendor (Optional)</label>
                                    <select value={form.vendorId} onChange={e => setForm({ ...form, vendorId: e.target.value })}
                                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-rose-500 bg-white">
                                        <option value="">None</option>
                                        {vendors.map(v => <option key={v._id} value={v._id}>{v.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-gray-600 mb-1 block">Department (Optional)</label>
                                    <input value={form.department} onChange={e => setForm({ ...form, department: e.target.value })}
                                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-rose-500"
                                        placeholder="e.g. IT, Administration..." />
                                </div>

                                {error && <p className="text-red-600 text-xs bg-red-50 rounded px-3 py-2 border border-red-100">{error}</p>}

                                <div className="flex gap-3 pt-2">
                                    <button type="button" onClick={() => setIsOpen(false)} className="flex-1 border border-gray-200 rounded-lg py-2.5 text-sm text-gray-600 hover:bg-gray-50 font-medium transition-colors">Cancel</button>
                                    <button type="submit" disabled={saving || !form.title || !form.amount} className="flex-1 bg-rose-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-rose-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors">
                                        {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} Save Template
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
