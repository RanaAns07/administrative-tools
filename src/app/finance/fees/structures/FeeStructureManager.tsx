'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ClipboardList, Plus, X, Check, Loader2 } from 'lucide-react';

interface FeeStructureManagerProps {
    initialStructures: any[];
    batches: any[];
}

export default function FeeStructureManager({ initialStructures, batches }: FeeStructureManagerProps) {
    const router = useRouter();
    const [structures, setStructures] = useState(initialStructures);
    const [showModal, setShowModal] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const [form, setForm] = useState({
        batchId: '',
        semesterNumber: 1,
        lateFeePerDay: 100,
        gracePeriodDays: 7,
        feeHeads: [
            { name: 'Tuition Fee', amount: 0, isOptional: false },
        ],
    });

    const addComponent = () => setForm({
        ...form,
        feeHeads: [...form.feeHeads, { name: '', amount: 0, isOptional: false }],
    });

    const removeComponent = (i: number) => setForm({
        ...form,
        feeHeads: form.feeHeads.filter((_, idx) => idx !== i),
    });

    const updateComponent = (i: number, field: string, val: string | number | boolean) => {
        const comps = [...form.feeHeads];
        comps[i] = { ...comps[i], [field]: val };
        setForm({ ...form, feeHeads: comps });
    };

    const totalAmount = form.feeHeads.reduce((s, c) => s + (Number(c.amount) || 0), 0);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError(null);
        try {
            const res = await fetch('/api/finance/fee-structures', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            setShowModal(false);
            setForm({
                batchId: '',
                semesterNumber: 1,
                lateFeePerDay: 100,
                gracePeriodDays: 7,
                feeHeads: [{ name: 'Tuition Fee', amount: 0, isOptional: false }]
            });

            // Refresh the server component to fetch latest data
            router.refresh();

            // Optionally optimistic UI update (router.refresh takes a moment)
            setStructures([data, ...structures]);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h1 className="text-xl font-bold text-leads-blue flex items-center gap-2">
                        <ClipboardList size={22} /> Fee Structures
                    </h1>
                    <p className="text-xs text-gray-500 mt-0.5">Program-wise fee components · {structures.length} structures</p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="flex items-center gap-2 bg-leads-blue text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-800 shadow-sm transition-colors"
                >
                    <Plus size={16} /> New Fee Structure
                </button>
            </div>

            {structures.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-200 py-16 text-center text-gray-400">
                    <ClipboardList size={40} className="mx-auto mb-3 opacity-30" />
                    <p className="text-sm">No fee structures yet. Create the first one to start billing students.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {structures.map((s, i) => {
                        const batchName = s.batchId?.programId?.name
                            ? `${s.batchId.programId.name} ${s.batchId.season} ${s.batchId.year}`
                            : 'Unknown Batch';

                        return (
                            <motion.div key={s._id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                                className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                                <button
                                    onClick={() => setExpandedId(expandedId === s._id ? null : s._id)}
                                    className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50/50 transition-colors"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="p-2.5 bg-leads-blue/10 rounded-lg">
                                            <ClipboardList size={18} className="text-leads-blue" />
                                        </div>
                                        <div>
                                            <p className="font-semibold text-gray-900">{batchName}</p>
                                            <p className="text-xs text-gray-500">Semester {s.semesterNumber}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="text-right">
                                            <p className="text-sm font-bold text-leads-blue">PKR {(s.totalAmount || 0).toLocaleString('en-PK')}</p>
                                            <p className="text-[10px] text-gray-400">{s.feeHeads?.length || 0} components</p>
                                        </div>
                                        <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${s.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                            {s.isActive ? 'ACTIVE' : 'INACTIVE'}
                                        </span>
                                    </div>
                                </button>

                                {expandedId === s._id && (
                                    <div className="border-t border-gray-100 px-5 py-4">
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-sm">
                                                <thead className="text-xs uppercase text-gray-500 border-b border-gray-100">
                                                    <tr>
                                                        <th className="text-left py-2 font-semibold">Component</th>
                                                        <th className="text-right py-2 font-semibold">Amount (PKR)</th>
                                                        <th className="text-center py-2 font-semibold">Type</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-50">
                                                    {s.feeHeads?.map((c: any, ci: number) => (
                                                        <tr key={ci}>
                                                            <td className="py-2 text-gray-700">{c.name}</td>
                                                            <td className="py-2 text-right font-mono text-gray-800">{c.amount.toLocaleString('en-PK')}</td>
                                                            <td className="py-2 text-center">
                                                                {!c.isOptional ? <Check size={14} className="mx-auto text-green-500" /> : <span className="text-[10px] bg-gray-100 px-2 py-0.5 rounded-full text-gray-500">OPTIONAL</span>}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                    <tr className="border-t-2 border-gray-200">
                                                        <td className="py-2 font-bold text-leads-blue">Total</td>
                                                        <td className="py-2 text-right font-bold font-mono text-leads-blue">{(s.totalAmount || 0).toLocaleString('en-PK')}</td>
                                                        <td />
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </div>
                                        <p className="text-xs text-gray-400 mt-2">Late fee: PKR {s.lateFeePerDay || 0}/day after {s.gracePeriodDays || 0} grace days</p>
                                    </div>
                                )}
                            </motion.div>
                        );
                    })}
                </div>
            )}

            {/* Create Modal */}
            <AnimatePresence>
                {showModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm overflow-y-auto">
                        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white rounded-2xl shadow-2xl w-full max-w-xl my-4">
                            <div className="flex justify-between items-center p-5 border-b border-gray-100">
                                <h2 className="font-bold text-leads-blue">New Fee Structure</h2>
                                <button onClick={() => setShowModal(false)}><X size={18} className="text-gray-400" /></button>
                            </div>
                            <form onSubmit={handleSubmit} className="p-5 space-y-4">
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="col-span-2">
                                        <label className="text-xs font-semibold text-gray-600 mb-1 block">Program Batch *</label>
                                        <select
                                            required
                                            value={form.batchId}
                                            onChange={e => setForm({ ...form, batchId: e.target.value })}
                                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-leads-blue bg-white"
                                        >
                                            <option value="">-- Select Batch --</option>
                                            {batches.map(b => (
                                                <option key={b._id} value={b._id}>
                                                    {b.programId?.name} — {b.season} {b.year}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold text-gray-600 mb-1 block">Semester Number *</label>
                                        <input
                                            required
                                            type="number"
                                            min="1"
                                            max="12"
                                            value={form.semesterNumber}
                                            onChange={e => setForm({ ...form, semesterNumber: parseInt(e.target.value) || 1 })}
                                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-leads-blue"
                                        />
                                    </div>
                                </div>

                                {/* Fee Components */}
                                <div>
                                    <div className="flex items-center justify-between mb-2 mt-4">
                                        <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Fee Components</label>
                                        <button type="button" onClick={addComponent} className="text-xs text-leads-blue hover:underline flex items-center gap-1"><Plus size={12} /> Add</button>
                                    </div>
                                    <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                                        <table className="w-full text-xs">
                                            <thead className="bg-gray-50 border-b border-gray-100">
                                                <tr>
                                                    <th className="px-3 py-2 text-left font-semibold text-gray-600">Component Name</th>
                                                    <th className="px-3 py-2 text-right font-semibold text-gray-600">Amount (PKR)</th>
                                                    <th className="px-3 py-2 text-center font-semibold text-gray-600">Optional</th>
                                                    <th className="w-8" />
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-50">
                                                {form.feeHeads.map((c, i) => (
                                                    <tr key={i}>
                                                        <td className="px-2 py-1.5">
                                                            <input required value={c.name} onChange={e => updateComponent(i, 'name', e.target.value)}
                                                                className="w-full border-0 bg-transparent focus:outline-none focus:ring-1 focus:ring-leads-blue rounded px-2 py-1 text-xs"
                                                                placeholder="Fee name" />
                                                        </td>
                                                        <td className="px-2 py-1.5">
                                                            <input required type="number" step="1" min="0" value={c.amount === 0 ? '' : c.amount}
                                                                onChange={e => updateComponent(i, 'amount', parseFloat(e.target.value) || 0)}
                                                                className="w-full text-right border-0 bg-transparent focus:outline-none focus:ring-1 focus:ring-leads-blue rounded px-2 py-1 text-xs"
                                                                placeholder="0" />
                                                        </td>
                                                        <td className="px-2 py-1.5 text-center">
                                                            <input type="checkbox" checked={c.isOptional} onChange={e => updateComponent(i, 'isOptional', e.target.checked)} className="w-3.5 h-3.5 rounded border-gray-300 text-leads-blue focus:ring-leads-blue" />
                                                        </td>
                                                        <td className="px-1 py-1.5 text-center">
                                                            {form.feeHeads.length > 1 && (
                                                                <button type="button" onClick={() => removeComponent(i)} className="text-red-400 hover:text-red-600 transition-colors p-1"><X size={14} /></button>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                            <tfoot className="bg-gray-50 border-t border-gray-200">
                                                <tr>
                                                    <td className="px-3 py-2.5 text-xs font-bold text-gray-700">Total Calculation</td>
                                                    <td className="px-3 py-2.5 text-right font-bold font-mono text-xs text-leads-blue">PKR {totalAmount.toLocaleString('en-PK')}</td>
                                                    <td colSpan={2} />
                                                </tr>
                                            </tfoot>
                                        </table>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3 mt-4">
                                    <div>
                                        <label className="text-xs font-semibold text-gray-600 mb-1 block">Late Fee (PKR/day)</label>
                                        <input type="number" min="0" value={form.lateFeePerDay} onChange={e => setForm({ ...form, lateFeePerDay: parseInt(e.target.value) || 0 })}
                                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-leads-blue" />
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold text-gray-600 mb-1 block">Grace Period (days)</label>
                                        <input type="number" min="0" value={form.gracePeriodDays} onChange={e => setForm({ ...form, gracePeriodDays: parseInt(e.target.value) || 0 })}
                                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-leads-blue" />
                                    </div>
                                </div>

                                {error && <div className="bg-red-50 border border-red-200 text-red-600 text-xs rounded-lg px-3 py-2.5 mt-2">{error}</div>}

                                <div className="flex gap-3 pt-3">
                                    <button type="button" onClick={() => setShowModal(false)} className="flex-1 border border-gray-200 rounded-lg py-2.5 text-sm text-gray-600 hover:bg-gray-50 font-medium transition-colors">Cancel</button>
                                    <button type="submit" disabled={saving || !form.batchId || form.feeHeads.length === 0}
                                        className="flex-1 bg-leads-blue text-white rounded-lg py-2.5 text-sm font-medium hover:bg-blue-800 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors">
                                        {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} Create Structure
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
