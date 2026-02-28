'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Plus, Loader2, X, CheckCircle2, Building2 } from 'lucide-react';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function DepartmentsManager({ initialDepartments }: { initialDepartments: any[] }) {
    const [search, setSearch] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Form state
    const [name, setName] = useState('');
    const [code, setCode] = useState('');
    const [headOfDepartment, setHeadOfDepartment] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const filtered = initialDepartments.filter(d =>
        d.name.toLowerCase().includes(search.toLowerCase()) ||
        d.code.toLowerCase().includes(search.toLowerCase()) ||
        (d.headOfDepartment && d.headOfDepartment.toLowerCase().includes(search.toLowerCase()))
    );

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);

        try {
            const res = await fetch('/api/finance/university/departments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, code, headOfDepartment })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to create department');

            window.location.reload();
        } catch (err: any) {
            setError(err.message || 'An error occurred.');
            setIsSubmitting(false);
        }
    };

    const toggleStatus = async (depId: string, currentStatus: boolean) => {
        try {
            const res = await fetch(`/api/finance/university/departments/${depId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isActive: !currentStatus })
            });
            if (res.ok) window.location.reload();
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-4 sm:p-6 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="relative">
                    <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
                    <input type="text" placeholder="Search departments..." value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm w-80 focus:outline-none focus:ring-2 focus:ring-leads-blue"
                    />
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="bg-leads-blue hover:bg-blue-800 text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
                >
                    <Plus size={16} />
                    New Department
                </button>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-gray-50 text-gray-500 text-xs font-semibold uppercase border-b border-gray-100">
                        <tr>
                            <th className="px-6 py-3">Code</th>
                            <th className="px-6 py-3">Name</th>
                            <th className="px-6 py-3">Head of Department</th>
                            <th className="px-6 py-3">Status</th>
                            <th className="px-6 py-3">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {filtered.length === 0 ? (
                            <tr><td colSpan={5} className="py-16 text-center text-gray-400">
                                <Building2 className="mx-auto mb-2 text-gray-200" size={32} />
                                No departments found.
                            </td></tr>
                        ) : filtered.map(d => (
                            <tr key={d._id} className="hover:bg-gray-50/50 transition-colors">
                                <td className="px-6 py-4 font-mono font-bold text-gray-900">{d.code}</td>
                                <td className="px-6 py-4 font-semibold text-gray-900">{d.name}</td>
                                <td className="px-6 py-4 text-gray-700">{d.headOfDepartment || 'N/A'}</td>
                                <td className="px-6 py-4">
                                    <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold uppercase ${d.isActive ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-gray-100 text-gray-500 border border-gray-200'}`}>
                                        {d.isActive ? 'Active' : 'Inactive'}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <button
                                        onClick={() => toggleStatus(d._id, d.isActive)}
                                        className="text-xs font-semibold text-gray-600 hover:text-leads-blue transition-colors px-3 py-1.5 rounded-lg border border-gray-200 hover:border-leads-blue hover:bg-blue-50/50"
                                    >
                                        Toggle Status
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm overflow-y-auto">
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white rounded-2xl shadow-2xl w-full max-w-md my-4"
                        >
                            <div className="flex justify-between items-center p-5 border-b border-gray-100">
                                <h2 className="font-bold text-gray-900">Add New Department</h2>
                                <button type="button" onClick={() => setIsModalOpen(false)}><X size={18} className="text-gray-400 hover:text-gray-600" /></button>
                            </div>

                            <form onSubmit={handleSubmit} className="p-5 space-y-4">
                                <div>
                                    <label className="text-xs font-semibold text-gray-600 mb-1 block">Department Name</label>
                                    <input
                                        required
                                        type="text"
                                        placeholder="e.g. Computer Science"
                                        value={name}
                                        onChange={e => setName(e.target.value)}
                                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-leads-blue"
                                    />
                                </div>

                                <div>
                                    <label className="text-xs font-semibold text-gray-600 mb-1 block">Department Code</label>
                                    <input
                                        required
                                        type="text"
                                        placeholder="e.g. CS"
                                        value={code}
                                        onChange={e => setCode(e.target.value)}
                                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-leads-blue uppercase"
                                    />
                                </div>

                                <div>
                                    <label className="text-xs font-semibold text-gray-600 mb-1 block">Head of Department (Optional)</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Dr. Jane Doe"
                                        value={headOfDepartment}
                                        onChange={e => setHeadOfDepartment(e.target.value)}
                                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-leads-blue"
                                    />
                                </div>

                                {error && <p className="text-red-600 text-xs bg-red-50 rounded-lg px-3 py-2 border border-red-100">{error}</p>}

                                <div className="flex gap-3 pt-4">
                                    <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 border border-gray-200 rounded-xl py-2.5 text-sm text-gray-600 hover:bg-gray-50 font-medium transition-colors">Cancel</button>
                                    <button type="submit" disabled={isSubmitting} className="flex-1 bg-leads-blue text-white rounded-xl py-2.5 text-sm font-medium hover:bg-blue-800 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors">
                                        {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                                        {isSubmitting ? 'Saving...' : 'Create Department'}
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
