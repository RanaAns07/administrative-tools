'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { CalendarDays, Plus, Lock, Unlock, Loader2, Check, X } from 'lucide-react';

interface FY { _id: string; name: string; startDate: string; endDate: string; status: string; }
interface Period { _id: string; periodName: string; startDate: string; endDate: string; isLocked: boolean; fiscalYear: { name: string } }

export default function FiscalYearsPage() {
    const [years, setYears] = useState<FY[]>([]);
    const [periods, setPeriods] = useState<Period[]>([]);
    const [selectedFY, setSelectedFY] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [form, setForm] = useState({ name: '', startDate: '', endDate: '' });
    const [generatingPeriods, setGeneratingPeriods] = useState(false);

    const generatePeriods = async (fyId: string) => {
        setGeneratingPeriods(true);
        try {
            const res = await fetch(`/api/finance/fiscal-years/${fyId}/generate-periods`, { method: 'POST' });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            fetchPeriods(fyId);
        } catch (err: any) { alert(err.message); }
        finally { setGeneratingPeriods(false); }
    };

    const fetchYears = async (autoSelectId?: string) => {
        const res = await fetch('/api/finance/fiscal-years');
        const d = await res.json();
        setYears(d);
        // Auto-select: prefer the explicitly provided id, then current, then first
        const target = autoSelectId || selectedFY || (d.length ? d[0]._id : '');
        if (target) setSelectedFY(target);
        setLoading(false);
    };

    const fetchPeriods = (fyId: string) => {
        if (!fyId) return;
        fetch(`/api/finance/accounting-periods?fiscalYear=${fyId}`).then(r => r.json()).then(setPeriods);
    };

    useEffect(() => { fetchYears(); }, []);
    useEffect(() => { fetchPeriods(selectedFY); }, [selectedFY]);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true); setError(null);
        try {
            const res = await fetch('/api/finance/fiscal-years', {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setShowModal(false);
            setForm({ name: '', startDate: '', endDate: '' });
            // Auto-select the newly created fiscal year so its periods appear immediately
            await fetchYears(data.fiscalYear._id);
        } catch (err: any) { setError(err.message); }
        finally { setSaving(false); }
    };

    const handleToggleLock = async (periodId: string, isLocked: boolean) => {
        try {
            const res = await fetch('/api/finance/accounting-periods', {
                method: 'PATCH', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ periodId, action: isLocked ? 'UNLOCK' : 'LOCK' }),
            });
            if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
            fetchPeriods(selectedFY);
        } catch (err: any) { alert(err.message); }
    };

    return (
        <div className="space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h1 className="text-xl font-bold text-leads-blue flex items-center gap-2"><CalendarDays size={22} /> Fiscal Years & Periods</h1>
                    <p className="text-xs text-gray-500 mt-0.5">Manage accounting years and lock periods after close</p>
                </div>
                <button onClick={() => setShowModal(true)}
                    className="flex items-center gap-2 bg-leads-blue text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-800 shadow-sm">
                    <Plus size={16} /> New Fiscal Year
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* Fiscal Years list */}
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-100 text-xs font-bold text-gray-600 uppercase tracking-wider">Fiscal Years</div>
                    {loading ? (
                        <div className="py-10 text-center"><Loader2 className="animate-spin mx-auto text-gray-400" size={20} /></div>
                    ) : years.length === 0 ? (
                        <p className="py-8 text-center text-gray-400 text-sm">No fiscal years. Create one to begin.</p>
                    ) : (
                        <div className="divide-y divide-gray-50">
                            {years.map((fy) => (
                                <button key={fy._id} onClick={() => setSelectedFY(fy._id)}
                                    className={`w-full text-left px-4 py-3 flex items-center justify-between transition-colors ${selectedFY === fy._id ? 'bg-leads-blue/5 border-r-2 border-leads-blue' : 'hover:bg-gray-50'}`}>
                                    <div>
                                        <p className="text-sm font-semibold text-gray-800">{fy.name}</p>
                                        <p className="text-xs text-gray-400">{new Date(fy.startDate).toLocaleDateString()} – {new Date(fy.endDate).toLocaleDateString()}</p>
                                    </div>
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${fy.status === 'OPEN' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                        {fy.status}
                                    </span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Accounting Periods */}
                <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-100 text-xs font-bold text-gray-600 uppercase tracking-wider">Accounting Periods</div>
                    {periods.length === 0 ? (
                        <div className="py-10 text-center space-y-3">
                            <p className="text-gray-400 text-sm">{selectedFY ? 'No periods found for this fiscal year.' : 'Select a fiscal year to see its periods.'}</p>
                            {selectedFY && (
                                <button
                                    onClick={() => generatePeriods(selectedFY)}
                                    disabled={generatingPeriods}
                                    className="inline-flex items-center gap-2 bg-leads-blue text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-800 disabled:opacity-50 transition-colors"
                                >
                                    {generatingPeriods ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                                    Generate 12 Monthly Periods
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 border-b border-gray-100 text-xs uppercase text-gray-500">
                                    <tr>
                                        <th className="px-4 py-2 text-left">#</th>
                                        <th className="px-4 py-2 text-left">Period</th>
                                        <th className="px-4 py-2 text-left">Start</th>
                                        <th className="px-4 py-2 text-left">End</th>
                                        <th className="px-4 py-2 text-center">Status</th>
                                        <th className="px-4 py-2 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {periods.map((p, i) => (
                                        <motion.tr key={p._id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                                            className={`${p.isLocked ? 'bg-gray-50/50' : ''} hover:bg-blue-50/20 transition-colors`}>
                                            <td className="px-4 py-2.5 text-xs text-gray-500">{i + 1}</td>
                                            <td className="px-4 py-2.5 font-medium text-gray-800">{p.periodName}</td>
                                            <td className="px-4 py-2.5 text-xs text-gray-500">{new Date(p.startDate).toLocaleDateString('en-PK')}</td>
                                            <td className="px-4 py-2.5 text-xs text-gray-500">{new Date(p.endDate).toLocaleDateString('en-PK')}</td>
                                            <td className="px-4 py-2.5 text-center">
                                                <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${p.isLocked ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                                                    {p.isLocked ? <Lock size={9} /> : <Unlock size={9} />}
                                                    {p.isLocked ? 'Locked' : 'Open'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-2.5 text-right">
                                                <button onClick={() => handleToggleLock(p._id, p.isLocked)}
                                                    className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-colors ${p.isLocked ? 'bg-green-50 text-green-700 hover:bg-green-100' : 'bg-red-50 text-red-700 hover:bg-red-100'}`}>
                                                    {p.isLocked ? 'Unlock' : 'Lock'}
                                                </button>
                                            </td>
                                        </motion.tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                    <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="font-bold text-leads-blue">New Fiscal Year</h2>
                            <button onClick={() => setShowModal(false)}><X size={18} className="text-gray-400" /></button>
                        </div>
                        <form onSubmit={handleCreate} className="space-y-4">
                            <div>
                                <label className="text-xs font-semibold text-gray-600 mb-1 block">Name</label>
                                <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                                    placeholder="e.g. FY 2025-26"
                                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-leads-blue" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-semibold text-gray-600 mb-1 block">Start Date</label>
                                    <input required type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-leads-blue" />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-gray-600 mb-1 block">End Date</label>
                                    <input required type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-leads-blue" />
                                </div>
                            </div>
                            {error && <p className="text-red-600 text-xs bg-red-50 rounded px-3 py-2">{error}</p>}
                            <p className="text-xs text-gray-400">12 monthly accounting periods will be auto-created.</p>
                            <div className="flex gap-3 pt-1">
                                <button type="button" onClick={() => setShowModal(false)}
                                    className="flex-1 border border-gray-200 rounded-lg py-2 text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
                                <button type="submit" disabled={saving}
                                    className="flex-1 bg-leads-blue text-white rounded-lg py-2 text-sm font-medium hover:bg-blue-800 flex items-center justify-center gap-2">
                                    {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Create
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}
        </div>
    );
}
