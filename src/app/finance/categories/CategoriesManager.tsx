'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Tag, Plus, X, Loader2, Check } from 'lucide-react';

export default function CategoriesManager({ initialCategories }: { initialCategories: any[] }) {
    const router = useRouter();
    const [categories, setCategories] = useState(initialCategories);
    const [showModal, setShowModal] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [form, setForm] = useState({ name: '', type: 'EXPENSE', description: '' });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError(null);

        try {
            const res = await fetch('/api/finance/categories', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form)
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to create category');

            setShowModal(false);
            setForm({ name: '', type: 'EXPENSE', description: '' });
            router.refresh();
            setCategories([...categories, data].sort((a, b) => a.type.localeCompare(b.type) || a.name.localeCompare(b.name)));
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-6 max-w-[1100px]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <span className="text-xs font-semibold text-leads-blue uppercase tracking-widest">Configuration</span>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight mt-0.5">Categories</h1>
                    <p className="text-sm text-gray-400">Manage {categories.length} income and expense tags.</p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="inline-flex items-center gap-2 bg-leads-blue text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-leads-blue/90 transition-colors shadow-sm"
                >
                    <Plus size={15} /> Add Category
                </button>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                    <h2 className="font-semibold text-gray-900 text-sm flex items-center gap-2">
                        <Tag size={15} className="text-leads-blue" /> All Categories
                    </h2>
                </div>

                {categories.length === 0 ? (
                    <div className="py-20 text-center">
                        <Tag size={40} className="text-gray-200 mx-auto mb-3" />
                        <p className="text-gray-500 font-medium">No categories created yet.</p>
                        <p className="text-sm text-gray-400 mt-1">Create categories to tag your transactions properly.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50/30 border-b border-gray-100">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Name & Description</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</th>
                                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {categories.map((cat) => (
                                    <tr key={cat._id} className="hover:bg-gray-50/60 transition-colors">
                                        <td className="px-6 py-4 max-w-sm">
                                            <p className="font-bold text-gray-900">{cat.name}</p>
                                            {cat.description && <p className="text-[11px] text-gray-500 mt-0.5 truncate">{cat.description}</p>}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`text-[10px] font-bold px-2 py-1 rounded-md ${cat.type === 'INCOME' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                                                {cat.type}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className={`text-xs font-semibold ${cat.isActive ? 'text-green-600' : 'text-gray-400'}`}>
                                                {cat.isActive ? 'ACTIVE' : 'INACTIVE'}
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
                {showModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
                            <div className="flex justify-between items-center mb-5 border-b border-gray-100 pb-3">
                                <h2 className="font-bold text-lg text-leads-blue flex items-center gap-2"><Tag size={18} /> New Category</h2>
                                <button type="button" onClick={() => setShowModal(false)}><X size={18} className="text-gray-400 hover:text-gray-600" /></button>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="text-xs font-semibold text-gray-600 mb-1 block">Category Name *</label>
                                    <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-leads-blue transition-shadow"
                                        placeholder="e.g. Utility Bills, Lab Fees" />
                                </div>

                                <div>
                                    <label className="text-xs font-semibold text-gray-600 mb-2 block">Category Type *</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            type="button"
                                            onClick={() => setForm({ ...form, type: 'INCOME' })}
                                            className={`py-2 px-3 border rounded-xl text-sm font-semibold flex justify-center items-center gap-2 transition-all ${form.type === 'INCOME' ? 'border-emerald-500 bg-emerald-50 text-emerald-700 ring-1 ring-emerald-500' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                                        >
                                            <div className={`w-3 h-3 rounded-full ${form.type === 'INCOME' ? 'bg-emerald-500' : 'bg-gray-200'}`} />
                                            Income
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setForm({ ...form, type: 'EXPENSE' })}
                                            className={`py-2 px-3 border rounded-xl text-sm font-semibold flex justify-center items-center gap-2 transition-all ${form.type === 'EXPENSE' ? 'border-rose-500 bg-rose-50 text-rose-700 ring-1 ring-rose-500' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                                        >
                                            <div className={`w-3 h-3 rounded-full ${form.type === 'EXPENSE' ? 'bg-rose-500' : 'bg-gray-200'}`} />
                                            Expense
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs font-semibold text-gray-600 mb-1 block">Description (Optional)</label>
                                    <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-leads-blue transition-shadow"
                                        placeholder="Brief explanation..." />
                                </div>

                                {error && <p className="text-red-600 text-xs bg-red-50 rounded-xl px-3 py-2 border border-red-100">{error}</p>}

                                <div className="flex gap-3 pt-4 border-t border-gray-100">
                                    <button type="button" onClick={() => setShowModal(false)} className="flex-1 border border-gray-200 rounded-xl py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
                                    <button type="submit" disabled={saving || !form.name} className="flex-1 bg-leads-blue text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-blue-800 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors">
                                        {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} Save Category
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
