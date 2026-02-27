'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, X, Loader2, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function ExpenseModal({ wallets, categories }: { wallets: any[], categories: any[] }) {
    const [isOpen, setIsOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    const [form, setForm] = useState({
        title: '',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        categoryId: categories.find(c => c.name?.toLowerCase().includes('office'))?._id || categories[0]?._id || '',
        walletId: wallets[0]?._id || '',
        notes: '',
        receiptUrl: '',
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError(null);

        try {
            const res = await fetch('/api/finance/expenses', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...form,
                    amount: Number(form.amount),
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to record expense');

            setIsOpen(false);
            setForm({
                title: '',
                amount: '',
                date: new Date().toISOString().split('T')[0],
                categoryId: categories[0]?._id || '',
                walletId: wallets[0]?._id || '',
                notes: '',
                receiptUrl: '',
            });
            router.refresh();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="inline-flex items-center gap-2 bg-leads-blue text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-leads-blue/90 transition-colors shadow-sm"
            >
                <Plus size={15} /> Record New Expense
            </button>

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
                                <h2 className="font-bold text-lg text-rose-600">Log Expense</h2>
                                <button type="button" onClick={() => setIsOpen(false)}><X size={18} className="text-gray-400 hover:text-gray-600" /></button>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="text-xs font-semibold text-gray-600 mb-1 block">Title *</label>
                                    <input required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
                                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-rose-500 transition-shadow"
                                        placeholder="e.g. Office Supplies" />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-xs font-semibold text-gray-600 mb-1 block">Amount (PKR) *</label>
                                        <input required type="number" step="0.01" min="1" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })}
                                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-rose-500 font-medium"
                                            placeholder="5000" />
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold text-gray-600 mb-1 block">Date *</label>
                                        <input required type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })}
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
                                    <label className="text-xs font-semibold text-gray-600 mb-1 block">Receipt URL (Optional)</label>
                                    <input value={form.receiptUrl} onChange={e => setForm({ ...form, receiptUrl: e.target.value })}
                                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-rose-500"
                                        placeholder="https://..." />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-gray-600 mb-1 block">Notes</label>
                                    <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
                                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-rose-500 min-h-[60px]"
                                        placeholder="Additional details..." />
                                </div>

                                {error && <p className="text-red-600 text-xs bg-red-50 rounded px-3 py-2 border border-red-100">{error}</p>}

                                <div className="flex gap-3 pt-2">
                                    <button type="button" onClick={() => setIsOpen(false)} className="flex-1 border border-gray-200 rounded-lg py-2.5 text-sm text-gray-600 hover:bg-gray-50 font-medium transition-colors">Cancel</button>
                                    <button type="submit" disabled={saving || !form.title || !form.amount} className="flex-1 bg-rose-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-rose-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors">
                                        {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} Save Expense
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </>
    );
}
