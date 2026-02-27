'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, X, Loader2, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function CreateWalletModal() {
    const [isOpen, setIsOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [form, setForm] = useState({ name: '', type: 'BANK', currency: 'PKR' });
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError(null);

        try {
            const res = await fetch('/api/finance/wallets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to create wallet');

            setIsOpen(false);
            setForm({ name: '', type: 'BANK', currency: 'PKR' });
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
                <Plus size={15} /> Add Wallet
            </button>

            <AnimatePresence>
                {isOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6"
                        >
                            <div className="flex justify-between items-center mb-5 border-b border-gray-100 pb-3">
                                <h2 className="font-bold text-lg text-leads-blue">New Wallet</h2>
                                <button type="button" onClick={() => setIsOpen(false)}><X size={18} className="text-gray-400 hover:text-gray-600" /></button>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="text-xs font-semibold text-gray-600 mb-1 block">Wallet Name</label>
                                    <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-leads-blue transition-shadow"
                                        placeholder="e.g. Main Bank Account" />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-xs font-semibold text-gray-600 mb-1 block">Type</label>
                                        <select required value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}
                                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-leads-blue bg-white">
                                            <option value="BANK">Bank</option>
                                            <option value="CASH">Cash</option>
                                            <option value="INVESTMENT">Investment</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold text-gray-600 mb-1 block">Currency</label>
                                        <input required value={form.currency} onChange={e => setForm({ ...form, currency: e.target.value })}
                                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-leads-blue"
                                            placeholder="PKR" />
                                    </div>
                                </div>

                                {error && <p className="text-red-600 text-xs bg-red-50 rounded px-3 py-2 border border-red-100">{error}</p>}

                                <div className="flex gap-3 pt-2">
                                    <button type="button" onClick={() => setIsOpen(false)} className="flex-1 border border-gray-200 rounded-lg py-2 text-sm text-gray-600 hover:bg-gray-50 font-medium transition-colors">Cancel</button>
                                    <button type="submit" disabled={saving || !form.name} className="flex-1 bg-leads-blue text-white rounded-lg py-2 text-sm font-medium hover:bg-blue-800 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors">
                                        {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Create
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
