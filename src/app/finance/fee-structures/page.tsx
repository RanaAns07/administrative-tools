'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ClipboardList, Plus, X, Check, Loader2, Edit2 } from 'lucide-react';

interface FeeStructure {
    _id: string;
    programName: string;
    semester: string;
    academicYear: string;
    totalAmount: number;
    feeComponents: Array<{ componentName: string; amount: number; isRequired: boolean }>;
    lateFeePerDay: number;
    gracePeriodDays: number;
    isActive: boolean;
}

export default function FeeStructuresPage() {
    const [structures, setStructures] = useState<FeeStructure[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const [form, setForm] = useState({
        programName: '',
        semester: '',
        academicYear: '',
        lateFeePerDay: 100,
        gracePeriodDays: 7,
        feeComponents: [
            { componentName: 'Tuition Fee', amount: 0, isRequired: true },
        ],
    });

    const fetchStructures = () => {
        setLoading(true);
        fetch('/api/finance/fee-structures')
            .then(r => r.json()).then(setStructures).finally(() => setLoading(false));
    };

    useEffect(() => { fetchStructures(); }, []);

    const addComponent = () => setForm({
        ...form,
        feeComponents: [...form.feeComponents, { componentName: '', amount: 0, isRequired: false }],
    });

    const removeComponent = (i: number) => setForm({
        ...form,
        feeComponents: form.feeComponents.filter((_, idx) => idx !== i),
    });

    const updateComponent = (i: number, field: string, val: string | number | boolean) => {
        const comps = [...form.feeComponents];
        comps[i] = { ...comps[i], [field]: val };
        setForm({ ...form, feeComponents: comps });
    };

    const totalAmount = form.feeComponents.reduce((s, c) => s + (Number(c.amount) || 0), 0);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault(); setSaving(true); setError(null);
        try {
            const res = await fetch('/api/finance/fee-structures', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setShowModal(false); fetchStructures();
            setForm({ programName: '', semester: '', academicYear: '', lateFeePerDay: 100, gracePeriodDays: 7, feeComponents: [{ componentName: 'Tuition Fee', amount: 0, isRequired: true }] });
        } catch (err: any) { setError(err.message); }
        finally { setSaving(false); }
    };

    const semesters = ['Fall 2025', 'Spring 2025', 'Fall 2024', 'Spring 2024', 'Summer 2025'];

    return (
        <div className="space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h1 className="text-xl font-bold text-leads-blue flex items-center gap-2"><ClipboardList size={22} /> Fee Structures</h1>
                    <p className="text-xs text-gray-500 mt-0.5">Program-wise fee components · {structures.length} structures</p>
                </div>
                <button onClick={() => setShowModal(true)}
                    className="flex items-center gap-2 bg-leads-blue text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-800 shadow-sm">
                    <Plus size={16} /> New Fee Structure
                </button>
            </div>

            {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm flex gap-2">{error} <button className="ml-auto" onClick={() => setError(null)}><X size={12} /></button></div>}

            {loading ? (
                <div className="py-16 text-center"><Loader2 className="animate-spin mx-auto text-gray-400" size={24} /></div>
            ) : structures.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-200 py-16 text-center text-gray-400">
                    <ClipboardList size={40} className="mx-auto mb-3 opacity-30" />
                    <p className="text-sm">No fee structures yet. Create the first one to start billing students.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {structures.map((s, i) => (
                        <motion.div key={s._id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                            className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                            <button
                                onClick={() => setExpandedId(expandedId === s._id ? null : s._id)}
                                className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50/50 transition-colors"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="p-2.5 bg-leads-blue/10 rounded-lg">
                                        <ClipboardList size={18} className="text-leads-blue" />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-gray-900">{s.programName}</p>
                                        <p className="text-xs text-gray-500">{s.semester} · {s.academicYear}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="text-right">
                                        <p className="text-sm font-bold text-leads-blue">PKR {s.totalAmount.toLocaleString('en-PK')}</p>
                                        <p className="text-[10px] text-gray-400">{s.feeComponents.length} components</p>
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
                                                    <th className="text-left py-2">Component</th>
                                                    <th className="text-right py-2">Amount (PKR)</th>
                                                    <th className="text-center py-2">Required</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-50">
                                                {s.feeComponents.map((c, ci) => (
                                                    <tr key={ci}>
                                                        <td className="py-2 text-gray-700">{c.componentName}</td>
                                                        <td className="py-2 text-right font-mono text-gray-800">{c.amount.toLocaleString('en-PK')}</td>
                                                        <td className="py-2 text-center">{c.isRequired ? <Check size={14} className="mx-auto text-green-500" /> : <span className="text-gray-300">—</span>}</td>
                                                    </tr>
                                                ))}
                                                <tr className="border-t-2 border-gray-200">
                                                    <td className="py-2 font-bold text-leads-blue">Total</td>
                                                    <td className="py-2 text-right font-bold font-mono text-leads-blue">{s.totalAmount.toLocaleString('en-PK')}</td>
                                                    <td />
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                    <p className="text-xs text-gray-400 mt-2">Late fee: PKR {s.lateFeePerDay}/day after {s.gracePeriodDays} grace days</p>
                                </div>
                            )}
                        </motion.div>
                    ))}
                </div>
            )}

            {/* Create Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm overflow-y-auto">
                    <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                        className="bg-white rounded-2xl shadow-2xl w-full max-w-xl my-4">
                        <div className="flex justify-between items-center p-5 border-b border-gray-100">
                            <h2 className="font-bold text-leads-blue">New Fee Structure</h2>
                            <button onClick={() => setShowModal(false)}><X size={18} className="text-gray-400" /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-5 space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="col-span-2">
                                    <label className="text-xs font-semibold text-gray-600 mb-1 block">Program Name *</label>
                                    <input required value={form.programName} onChange={e => setForm({ ...form, programName: e.target.value })}
                                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-leads-blue"
                                        placeholder="e.g. BS Computer Science" />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-gray-600 mb-1 block">Semester *</label>
                                    <select required value={form.semester} onChange={e => setForm({ ...form, semester: e.target.value })}
                                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-leads-blue">
                                        <option value="">-- Select --</option>
                                        {semesters.map(s => <option key={s}>{s}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-gray-600 mb-1 block">Academic Year *</label>
                                    <input required value={form.academicYear} onChange={e => setForm({ ...form, academicYear: e.target.value })}
                                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-leads-blue"
                                        placeholder="2025-26" />
                                </div>
                            </div>

                            {/* Fee Components */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Fee Components</label>
                                    <button type="button" onClick={addComponent} className="text-xs text-leads-blue hover:underline flex items-center gap-1"><Plus size={12} /> Add</button>
                                </div>
                                <div className="border border-gray-200 rounded-xl overflow-hidden">
                                    <table className="w-full text-xs">
                                        <thead className="bg-gray-50 border-b border-gray-100">
                                            <tr>
                                                <th className="px-3 py-2 text-left font-semibold text-gray-600">Component Name</th>
                                                <th className="px-3 py-2 text-right font-semibold text-gray-600">Amount (PKR)</th>
                                                <th className="px-3 py-2 text-center font-semibold text-gray-600">Required</th>
                                                <th className="w-8" />
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50">
                                            {form.feeComponents.map((c, i) => (
                                                <tr key={i}>
                                                    <td className="px-2 py-1.5">
                                                        <input value={c.componentName} onChange={e => updateComponent(i, 'componentName', e.target.value)}
                                                            className="w-full border-0 bg-transparent focus:outline-none focus:ring-1 focus:ring-leads-blue rounded px-1 text-xs"
                                                            placeholder="Fee name" />
                                                    </td>
                                                    <td className="px-2 py-1.5">
                                                        <input type="number" step="1" min="0" value={c.amount || ''}
                                                            onChange={e => updateComponent(i, 'amount', parseFloat(e.target.value) || 0)}
                                                            className="w-full text-right border-0 bg-transparent focus:outline-none focus:ring-1 focus:ring-leads-blue rounded px-1 text-xs"
                                                            placeholder="0" />
                                                    </td>
                                                    <td className="px-2 py-1.5 text-center">
                                                        <input type="checkbox" checked={c.isRequired} onChange={e => updateComponent(i, 'isRequired', e.target.checked)} className="w-3.5 h-3.5" />
                                                    </td>
                                                    <td className="px-1 py-1.5 text-center">
                                                        {form.feeComponents.length > 1 && (
                                                            <button type="button" onClick={() => removeComponent(i)} className="text-red-400 hover:text-red-600"><X size={12} /></button>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                                            <tr>
                                                <td className="px-3 py-2 text-xs font-bold text-gray-700">Total</td>
                                                <td className="px-3 py-2 text-right font-bold font-mono text-xs text-leads-blue">PKR {totalAmount.toLocaleString('en-PK')}</td>
                                                <td colSpan={2} />
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-semibold text-gray-600 mb-1 block">Late Fee (PKR/day)</label>
                                    <input type="number" value={form.lateFeePerDay} onChange={e => setForm({ ...form, lateFeePerDay: parseInt(e.target.value) || 0 })}
                                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-leads-blue" />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-gray-600 mb-1 block">Grace Period (days)</label>
                                    <input type="number" value={form.gracePeriodDays} onChange={e => setForm({ ...form, gracePeriodDays: parseInt(e.target.value) || 0 })}
                                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-leads-blue" />
                                </div>
                            </div>

                            {error && <p className="text-red-600 text-xs bg-red-50 rounded px-3 py-2">{error}</p>}
                            <div className="flex gap-3 pt-1">
                                <button type="button" onClick={() => setShowModal(false)} className="flex-1 border border-gray-200 rounded-lg py-2 text-sm text-gray-600">Cancel</button>
                                <button type="submit" disabled={saving || !form.programName || !form.semester}
                                    className="flex-1 bg-leads-blue text-white rounded-lg py-2 text-sm font-medium hover:bg-blue-800 disabled:opacity-50 flex items-center justify-center gap-2">
                                    {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Create Structure
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}
        </div>
    );
}
