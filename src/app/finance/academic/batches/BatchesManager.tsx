'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Plus, Loader2, X, CheckCircle2, GraduationCap } from 'lucide-react';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function BatchesManager({ initialBatches, programs }: { initialBatches: any[], programs: any[] }) {
    const [search, setSearch] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Form state
    const [programId, setProgramId] = useState(programs[0]?._id || '');
    const [year, setYear] = useState(new Date().getFullYear());
    const [season, setSeason] = useState('FALL');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const filtered = initialBatches.filter(b =>
        b.programId?.name?.toLowerCase().includes(search.toLowerCase()) ||
        b.programId?.code?.toLowerCase().includes(search.toLowerCase()) ||
        b.year.toString().includes(search) ||
        b.season.toLowerCase().includes(search.toLowerCase())
    );

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);

        try {
            const res = await fetch('/api/finance/university/batches', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ programId, year: Number(year), season })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to create batch');

            window.location.reload();
        } catch (err: any) {
            setError(err.message || 'An error occurred.');
            setIsSubmitting(false);
        }
    };

    const toggleStatus = async (batchId: string, currentStatus: boolean) => {
        try {
            const res = await fetch(`/api/finance/university/batches/${batchId}`, {
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
                    <input type="text" placeholder="Search batches..." value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm w-80 focus:outline-none focus:ring-2 focus:ring-leads-blue"
                    />
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="bg-leads-blue hover:bg-blue-800 text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
                >
                    <Plus size={16} />
                    New Batch
                </button>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-gray-50 text-gray-500 text-xs font-semibold uppercase border-b border-gray-100">
                        <tr>
                            <th className="px-6 py-3">Program</th>
                            <th className="px-6 py-3">Year</th>
                            <th className="px-6 py-3">Season</th>
                            <th className="px-6 py-3">Batch Name</th>
                            <th className="px-6 py-3">Status</th>
                            <th className="px-6 py-3">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {filtered.length === 0 ? (
                            <tr><td colSpan={6} className="py-16 text-center text-gray-400">
                                <GraduationCap className="mx-auto mb-2 text-gray-200" size={32} />
                                No batches found.
                            </td></tr>
                        ) : filtered.map(b => (
                            <tr key={b._id} className="hover:bg-gray-50/50 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="font-semibold text-gray-900">{b.programId?.name || 'N/A'}</div>
                                    <div className="text-xs text-gray-500 font-mono mt-0.5">{b.programId?.code || 'N/A'}</div>
                                </td>
                                <td className="px-6 py-4 font-bold text-gray-900">{b.year}</td>
                                <td className="px-6 py-4 text-gray-700">{b.season}</td>
                                <td className="px-6 py-4 font-semibold text-leads-blue">
                                    {b.programId?.code} {b.season.charAt(0)}{b.season.slice(1).toLowerCase()} {b.year}
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold uppercase ${b.isActive ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-gray-100 text-gray-500 border border-gray-200'}`}>
                                        {b.isActive ? 'Active' : 'Inactive'}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <button
                                        onClick={() => toggleStatus(b._id, b.isActive)}
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
                                <h2 className="font-bold text-gray-900">Register New Batch</h2>
                                <button type="button" onClick={() => setIsModalOpen(false)}><X size={18} className="text-gray-400 hover:text-gray-600" /></button>
                            </div>

                            <form onSubmit={handleSubmit} className="p-5 space-y-4">
                                <div>
                                    <label className="text-xs font-semibold text-gray-600 mb-1 block">Program</label>
                                    <select
                                        required
                                        value={programId}
                                        onChange={e => setProgramId(e.target.value)}
                                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-leads-blue bg-white"
                                    >
                                        {programs.map(p => (
                                            <option key={p._id} value={p._id}>{p.name} ({p.code})</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs font-semibold text-gray-600 mb-1 block">Year</label>
                                        <input
                                            required
                                            type="number"
                                            min="2000"
                                            max="2100"
                                            value={year}
                                            onChange={e => setYear(Number(e.target.value))}
                                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-leads-blue"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold text-gray-600 mb-1 block">Season</label>
                                        <select
                                            required
                                            value={season}
                                            onChange={e => setSeason(e.target.value)}
                                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-leads-blue bg-white"
                                        >
                                            <option value="FALL">Fall</option>
                                            <option value="SPRING">Spring</option>
                                        </select>
                                    </div>
                                </div>

                                {error && <p className="text-red-600 text-xs bg-red-50 rounded-lg px-3 py-2 border border-red-100">{error}</p>}

                                <div className="flex gap-3 pt-4">
                                    <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 border border-gray-200 rounded-xl py-2.5 text-sm text-gray-600 hover:bg-gray-50 font-medium transition-colors">Cancel</button>
                                    <button type="submit" disabled={isSubmitting} className="flex-1 bg-leads-blue text-white rounded-xl py-2.5 text-sm font-medium hover:bg-blue-800 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors">
                                        {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                                        {isSubmitting ? 'Saving...' : 'Create Batch'}
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
