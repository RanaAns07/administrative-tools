'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { GraduationCap, Plus, X, Loader2, Check } from 'lucide-react';

export default function ProgramsManager({ initialPrograms }: { initialPrograms: any[] }) {
    const router = useRouter();
    const [programs, setPrograms] = useState(initialPrograms);
    const [showModal, setShowModal] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [form, setForm] = useState({ name: '', code: '', totalSemesters: 8 });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError(null);

        try {
            const res = await fetch('/api/finance/university/programs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form)
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to create program');

            setShowModal(false);
            setForm({ name: '', code: '', totalSemesters: 8 });
            router.refresh();
            setPrograms([...programs, data].sort((a, b) => a.name.localeCompare(b.name)));
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
                    <span className="text-xs font-semibold text-leads-blue uppercase tracking-widest">University</span>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight mt-0.5">Academic Programs</h1>
                    <p className="text-sm text-gray-400">Manage {programs.length} degree programs and their durations.</p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="inline-flex items-center gap-2 bg-leads-blue text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-leads-blue/90 transition-colors shadow-sm"
                >
                    <Plus size={15} /> Add Program
                </button>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                    <h2 className="font-semibold text-gray-900 text-sm flex items-center gap-2">
                        <GraduationCap size={15} className="text-leads-blue" /> All Programs
                    </h2>
                </div>

                {programs.length === 0 ? (
                    <div className="py-20 text-center">
                        <GraduationCap size={40} className="text-gray-200 mx-auto mb-3" />
                        <p className="text-gray-500 font-medium">No programs added yet.</p>
                        <p className="text-sm text-gray-400 mt-1">Add the first academic program to enroll students.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50/30 border-b border-gray-100">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Program Name</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Code</th>
                                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Semesters</th>
                                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {programs.map((prog) => (
                                    <tr key={prog._id} className="hover:bg-gray-50/60 transition-colors">
                                        <td className="px-6 py-4">
                                            <p className="font-bold text-gray-900">{prog.name}</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-xs font-mono font-bold px-2 py-1 rounded bg-gray-100 text-gray-600 border border-gray-200">
                                                {prog.code}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="font-semibold text-gray-700">{prog.totalSemesters}</span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${prog.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                                {prog.isActive ? 'ACTIVE' : 'INACTIVE'}
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
                                <h2 className="font-bold text-lg text-leads-blue flex items-center gap-2"><GraduationCap size={18} /> New Program</h2>
                                <button type="button" onClick={() => setShowModal(false)}><X size={18} className="text-gray-400 hover:text-gray-600" /></button>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="text-xs font-semibold text-gray-600 mb-1 block">Program Name *</label>
                                    <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-leads-blue transition-shadow"
                                        placeholder="e.g. BS Computer Science" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs font-semibold text-gray-600 mb-1 block">Short Code *</label>
                                        <input required value={form.code} onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })}
                                            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-leads-blue font-mono"
                                            placeholder="BSCS" />
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold text-gray-600 mb-1 block">Total Semesters *</label>
                                        <input required type="number" min="1" max="14" value={form.totalSemesters} onChange={e => setForm({ ...form, totalSemesters: parseInt(e.target.value) || 1 })}
                                            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-leads-blue" />
                                    </div>
                                </div>

                                {error && <p className="text-red-600 text-xs bg-red-50 rounded-xl px-3 py-2 border border-red-100">{error}</p>}

                                <div className="flex gap-3 pt-4 border-t border-gray-100">
                                    <button type="button" onClick={() => setShowModal(false)} className="flex-1 border border-gray-200 rounded-xl py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
                                    <button type="submit" disabled={saving || !form.name || !form.code} className="flex-1 bg-leads-blue text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-blue-800 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors">
                                        {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} Save Program
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
