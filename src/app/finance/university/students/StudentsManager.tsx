'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Plus, X, Loader2, Check, Search, Receipt } from 'lucide-react';

export default function StudentsManager({ initialStudents, batches }: { initialStudents: any[], batches: any[] }) {
    const router = useRouter();
    const [students, setStudents] = useState(initialStudents);
    const [showModal, setShowModal] = useState(false);
    const [saving, setSaving] = useState(false);
    const [search, setSearch] = useState('');
    const [error, setError] = useState<string | null>(null);

    const [form, setForm] = useState({ registrationNumber: '', name: '', email: '', batchId: '', currentSemester: 1 });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError(null);

        try {
            const res = await fetch('/api/finance/university/students', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form)
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to create student');

            setShowModal(false);
            setForm({ registrationNumber: '', name: '', email: '', batchId: '', currentSemester: 1 });
            router.refresh();
            setStudents([...students, data].sort((a, b) => a.registrationNumber.localeCompare(b.registrationNumber)));
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    const filtered = students.filter(s =>
        s.registrationNumber.toLowerCase().includes(search.toLowerCase()) ||
        s.name.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="space-y-6 max-w-[1100px]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <span className="text-xs font-semibold text-leads-blue uppercase tracking-widest">University</span>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight mt-0.5">Students</h1>
                    <p className="text-sm text-gray-400">Manage students and quickly access their fee records.</p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="inline-flex items-center gap-2 bg-leads-blue text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-leads-blue/90 transition-colors shadow-sm"
                >
                    <Plus size={15} /> Add Student
                </button>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gray-50/50">
                    <h2 className="font-semibold text-gray-900 text-sm flex items-center gap-2">
                        <Users size={15} className="text-leads-blue" /> Directory ({students.length})
                    </h2>
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 text-gray-400" size={15} />
                        <input
                            type="text"
                            placeholder="Search by name or reg..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-sm w-full sm:w-64 focus:outline-none focus:ring-1 focus:ring-leads-blue bg-white"
                        />
                    </div>
                </div>

                {filtered.length === 0 ? (
                    <div className="py-20 text-center">
                        <Users size={40} className="text-gray-200 mx-auto mb-3" />
                        <p className="text-gray-500 font-medium">{search ? 'No students match your search.' : 'No students found.'}</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50/30 border-b border-gray-100">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Registration</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Name</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Program / Batch</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filtered.map((student) => (
                                    <tr key={student._id} className="hover:bg-gray-50/60 transition-colors">
                                        <td className="px-6 py-4">
                                            <span className="text-sm font-mono font-bold text-leads-blue">
                                                {student.registrationNumber}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="font-bold text-gray-900">{student.name}</p>
                                            {student.email && <p className="text-xs text-gray-500 mt-0.5">{student.email}</p>}
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="font-semibold text-gray-700">{student.batchId?.programId?.code}</p>
                                            <p className="text-[10px] text-gray-500 uppercase mt-0.5">{student.batchId?.season} {student.batchId?.year}</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${student.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                                {student.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <a
                                                href={`/finance/fees/receive?search=${encodeURIComponent(student.registrationNumber)}`}
                                                className="inline-flex items-center gap-1.5 text-xs font-semibold text-leads-blue hover:text-blue-800 transition-colors"
                                            >
                                                <Receipt size={14} /> Fees Summary
                                            </a>
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
                                <h2 className="font-bold text-lg text-leads-blue flex items-center gap-2"><Users size={18} /> Add Student</h2>
                                <button type="button" onClick={() => setShowModal(false)}><X size={18} className="text-gray-400 hover:text-gray-600" /></button>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs font-semibold text-gray-600 mb-1 block">Registration No. *</label>
                                        <input required value={form.registrationNumber} onChange={e => setForm({ ...form, registrationNumber: e.target.value.toUpperCase() })}
                                            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-leads-blue font-mono"
                                            placeholder="FA24-BSCS-001" />
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold text-gray-600 mb-1 block">Full Name *</label>
                                        <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                                            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-leads-blue" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="col-span-2">
                                        <label className="text-xs font-semibold text-gray-600 mb-1 block">Email (Optional)</label>
                                        <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                                            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-leads-blue" />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-gray-600 mb-1 block">Batch *</label>
                                    <select required value={form.batchId} onChange={e => setForm({ ...form, batchId: e.target.value })}
                                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-leads-blue bg-white">
                                        <option value="">-- Select Batch --</option>
                                        {batches.map(b => (
                                            <option key={b._id} value={b._id}>
                                                {b.programId?.code} — {b.season} {b.year}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {error && <p className="text-red-600 text-xs bg-red-50 rounded-xl px-3 py-2 border border-red-100">{error}</p>}

                                <div className="flex gap-3 pt-4 border-t border-gray-100">
                                    <button type="button" onClick={() => setShowModal(false)} className="flex-1 border border-gray-200 rounded-xl py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
                                    <button type="submit" disabled={saving || !form.registrationNumber || !form.name || !form.batchId}
                                        className="flex-1 bg-leads-blue text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-blue-800 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors">
                                        {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} Save Student
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
