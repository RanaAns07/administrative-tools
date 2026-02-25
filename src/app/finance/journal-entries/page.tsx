'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, FileText, Loader2, X, Check, Trash2, Send, CheckCircle, Eye } from 'lucide-react';

interface JE {
    _id: string;
    entryNumber: string;
    entryDate: string;
    description: string;
    status: string;
    source: string;
    totalDebit: number;
    totalCredit: number;
    submittedBy: string;
}

interface CoA {
    _id: string;
    accountCode: string;
    accountName: string;
    isControl: boolean;
}

const statusColors: Record<string, string> = {
    DRAFT: 'bg-gray-100 text-gray-700',
    PENDING_APPROVAL: 'bg-yellow-100 text-yellow-700',
    POSTED: 'bg-green-100 text-green-700',
    REJECTED: 'bg-red-100 text-red-700',
};

export default function JournalEntriesPage() {
    const [entries, setEntries] = useState<JE[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [accounts, setAccounts] = useState<CoA[]>([]);
    const [filterStatus, setFilterStatus] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Detail modal
    interface JELine { accountCode: string; accountName: string; debit: number; credit: number; narration?: string; }
    interface JEDetail { entryNumber: string; entryDate: string; description: string; source: string; status: string; createdBy?: string; totalDebit: number; totalCredit: number; lines: JELine[]; }
    const [detailEntry, setDetailEntry] = useState<JEDetail | null>(null);
    const [detailLoading, setDetailLoading] = useState(false);

    const openDetail = async (id: string) => {
        setDetailLoading(true);
        setDetailEntry(null);
        try {
            const res = await fetch(`/api/finance/journal-entries/${id}`);
            const d = await res.json();
            if (d.error) throw new Error(d.error);
            setDetailEntry({
                entryNumber: d.entryNumber, entryDate: d.entryDate,
                description: d.description, source: d.source,
                status: d.status, createdBy: d.createdBy,
                totalDebit: d.totalDebit, totalCredit: d.totalCredit,
                lines: (d.lines || []).map((l: any) => ({
                    accountCode: l.account?.accountCode || l.accountCode || '—',
                    accountName: l.account?.accountName || l.accountName || '—',
                    debit: l.debit || 0, credit: l.credit || 0, narration: l.narration || '',
                })),
            });
        } catch (e: any) { setError(e.message); }
        finally { setDetailLoading(false); }
    };

    const emptyLine = { account: '', debit: 0, credit: 0, narration: '' };
    const [form, setForm] = useState({
        entryDate: new Date().toISOString().split('T')[0],
        description: '',
        reference: '',
        lines: [{ ...emptyLine }, { ...emptyLine }],
    });

    const fetch_ = (status = '') => {
        setLoading(true);
        const qs = status ? `?status=${status}` : '';
        fetch(`/api/finance/journal-entries${qs}`)
            .then((r) => r.json())
            .then((d) => { setEntries(d.entries || []); setTotal(d.total || 0); })
            .catch((e) => setError(e.message))
            .finally(() => setLoading(false));
    };

    useEffect(() => { fetch_(filterStatus); }, [filterStatus]);

    useEffect(() => {
        fetch('/api/finance/chart-of-accounts?active=true')
            .then((r) => r.json())
            .then((d) => setAccounts(d.filter((a: CoA) => !a.isControl)));
    }, []);

    const totalDebit = form.lines.reduce((s, l) => s + (Number(l.debit) || 0), 0);
    const totalCredit = form.lines.reduce((s, l) => s + (Number(l.credit) || 0), 0);
    const isBalanced = parseFloat(totalDebit.toFixed(2)) === parseFloat(totalCredit.toFixed(2)) && totalDebit > 0;

    const addLine = () => setForm({ ...form, lines: [...form.lines, { ...emptyLine }] });
    const removeLine = (i: number) => setForm({ ...form, lines: form.lines.filter((_, idx) => idx !== i) });
    const updateLine = (i: number, field: string, val: string | number) => {
        const lines = [...form.lines];
        lines[i] = { ...lines[i], [field]: val };
        setForm({ ...form, lines });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isBalanced) return;
        setSaving(true);
        setError(null);
        try {
            const res = await fetch('/api/finance/journal-entries', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setShowModal(false);
            setForm({ entryDate: new Date().toISOString().split('T')[0], description: '', reference: '', lines: [{ ...emptyLine }, { ...emptyLine }] });
            fetch_(filterStatus);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleAction = async (id: string, action: string) => {
        try {
            const res = await fetch(`/api/finance/journal-entries/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            fetch_(filterStatus);
        } catch (err: any) {
            alert(err.message);
        }
    };

    return (
        <div className="space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h1 className="text-xl font-bold text-leads-blue flex items-center gap-2"><FileText size={22} /> Journal Entries</h1>
                    <p className="text-xs text-gray-500 mt-0.5">Double-entry general journal · {total} total entries</p>
                </div>
                <button onClick={() => setShowModal(true)}
                    className="flex items-center gap-2 bg-leads-blue text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-800 transition-colors shadow-sm">
                    <Plus size={16} /> New Entry
                </button>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm flex gap-2 items-center">
                    <X size={16} />{error}<button className="ml-auto" onClick={() => setError(null)}><X size={12} /></button>
                </div>
            )}

            {/* Filters */}
            <div className="flex flex-wrap gap-2">
                {['', 'DRAFT', 'PENDING_APPROVAL', 'POSTED', 'REJECTED'].map((s) => (
                    <button key={s} onClick={() => setFilterStatus(s)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filterStatus === s ? 'bg-leads-blue text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                        {s || 'All'}
                    </button>
                ))}
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 border-b border-gray-100 text-xs uppercase text-gray-500 font-semibold tracking-wider">
                            <tr>
                                <th className="px-4 py-3">Entry #</th>
                                <th className="px-4 py-3">Date</th>
                                <th className="px-4 py-3">Description</th>
                                <th className="px-4 py-3">Source</th>
                                <th className="px-4 py-3 text-right">Debit</th>
                                <th className="px-4 py-3 text-right">Credit</th>
                                <th className="px-4 py-3 text-center">Status</th>
                                <th className="px-4 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {loading ? (
                                <tr><td colSpan={8} className="py-12 text-center"><Loader2 className="animate-spin mx-auto text-gray-400" size={24} /></td></tr>
                            ) : entries.length === 0 ? (
                                <tr><td colSpan={8} className="py-10 text-center text-gray-400 text-sm">No journal entries found. Create your first entry.</td></tr>
                            ) : (
                                entries.map((je, i) => (
                                    <motion.tr key={je._id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}
                                        className="hover:bg-blue-50/20 transition-colors">
                                        <td className="px-4 py-3 font-mono text-xs font-semibold text-leads-blue">{je.entryNumber}</td>
                                        <td className="px-4 py-3 text-xs text-gray-600">{new Date(je.entryDate).toLocaleDateString('en-PK')}</td>
                                        <td className="px-4 py-3 text-sm text-gray-800 max-w-xs truncate">{je.description}</td>
                                        <td className="px-4 py-3 text-xs text-gray-500">{je.source.replace(/_/g, ' ')}</td>
                                        <td className="px-4 py-3 text-right font-mono text-xs text-gray-700">{je.totalDebit.toLocaleString('en-PK', { minimumFractionDigits: 2 })}</td>
                                        <td className="px-4 py-3 text-right font-mono text-xs text-gray-700">{je.totalCredit.toLocaleString('en-PK', { minimumFractionDigits: 2 })}</td>
                                        <td className="px-4 py-3 text-center">
                                            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${statusColors[je.status]}`}>
                                                {je.status.replace(/_/g, ' ')}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <button onClick={() => openDetail(je._id)} title="View Details"
                                                    className="p-1.5 text-leads-blue hover:bg-blue-50 rounded-lg transition-colors">
                                                    <Eye size={14} />
                                                </button>
                                                {je.status === 'DRAFT' && (
                                                    <button onClick={() => handleAction(je._id, 'SUBMIT')} title="Submit for Approval"
                                                        className="p-1.5 text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors">
                                                        <Send size={14} />
                                                    </button>
                                                )}
                                                {je.status === 'PENDING_APPROVAL' && (
                                                    <button onClick={() => handleAction(je._id, 'POST')} title="Post Entry"
                                                        className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors">
                                                        <CheckCircle size={14} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </motion.tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Create Journal Entry Modal */}
            <AnimatePresence>
                {showModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
                            <div className="flex justify-between items-center p-5 border-b border-gray-100">
                                <h2 className="font-bold text-leads-blue flex items-center gap-2"><FileText size={18} /> New Journal Entry</h2>
                                <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
                            </div>
                            <div className="overflow-y-auto flex-1">
                                <form onSubmit={handleSubmit} className="p-5 space-y-5">
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                        <div>
                                            <label className="text-xs font-semibold text-gray-600 mb-1 block">Entry Date *</label>
                                            <input type="date" required value={form.entryDate} onChange={(e) => setForm({ ...form, entryDate: e.target.value })}
                                                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-leads-blue" />
                                        </div>
                                        <div className="sm:col-span-2">
                                            <label className="text-xs font-semibold text-gray-600 mb-1 block">Description *</label>
                                            <input required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                                                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-leads-blue"
                                                placeholder="e.g. Monthly utilities payment" />
                                        </div>
                                    </div>

                                    {/* Journal Lines */}
                                    <div>
                                        <div className="flex items-center justify-between mb-2">
                                            <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Journal Lines</h3>
                                            <button type="button" onClick={addLine}
                                                className="text-xs text-leads-blue hover:underline flex items-center gap-1"><Plus size={12} /> Add Line</button>
                                        </div>
                                        <div className="border border-gray-200 rounded-xl overflow-hidden">
                                            <table className="w-full text-xs">
                                                <thead className="bg-gray-50 border-b border-gray-100">
                                                    <tr>
                                                        <th className="px-3 py-2 text-left font-semibold text-gray-600">Account</th>
                                                        <th className="px-3 py-2 text-right font-semibold text-gray-600">Debit (PKR)</th>
                                                        <th className="px-3 py-2 text-right font-semibold text-gray-600">Credit (PKR)</th>
                                                        <th className="px-3 py-2 text-left font-semibold text-gray-600">Narration</th>
                                                        <th className="w-8" />
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-50">
                                                    {form.lines.map((line, i) => (
                                                        <tr key={i}>
                                                            <td className="px-2 py-1.5">
                                                                <select value={line.account} onChange={(e) => updateLine(i, 'account', e.target.value)}
                                                                    className="w-full border-0 bg-transparent focus:outline-none text-xs focus:ring-1 focus:ring-leads-blue rounded px-1">
                                                                    <option value="">-- Select Account --</option>
                                                                    {accounts.map((a) => (
                                                                        <option key={a._id} value={a._id}>{a.accountCode} – {a.accountName}</option>
                                                                    ))}
                                                                </select>
                                                            </td>
                                                            <td className="px-2 py-1.5">
                                                                <input type="number" step="0.01" min="0" value={line.debit || ''}
                                                                    onChange={(e) => updateLine(i, 'debit', parseFloat(e.target.value) || 0)}
                                                                    className="w-full text-right border-0 bg-transparent focus:outline-none text-xs focus:ring-1 focus:ring-leads-blue rounded px-1"
                                                                    placeholder="0.00" />
                                                            </td>
                                                            <td className="px-2 py-1.5">
                                                                <input type="number" step="0.01" min="0" value={line.credit || ''}
                                                                    onChange={(e) => updateLine(i, 'credit', parseFloat(e.target.value) || 0)}
                                                                    className="w-full text-right border-0 bg-transparent focus:outline-none text-xs focus:ring-1 focus:ring-leads-blue rounded px-1"
                                                                    placeholder="0.00" />
                                                            </td>
                                                            <td className="px-2 py-1.5">
                                                                <input value={line.narration} onChange={(e) => updateLine(i, 'narration', e.target.value)}
                                                                    className="w-full border-0 bg-transparent focus:outline-none text-xs focus:ring-1 focus:ring-leads-blue rounded px-1"
                                                                    placeholder="Optional note" />
                                                            </td>
                                                            <td className="px-1 py-1.5 text-center">
                                                                {form.lines.length > 2 && (
                                                                    <button type="button" onClick={() => removeLine(i)} className="text-red-400 hover:text-red-600">
                                                                        <Trash2 size={12} />
                                                                    </button>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                                <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                                                    <tr>
                                                        <td className="px-3 py-2 text-xs font-bold text-gray-700">TOTALS</td>
                                                        <td className="px-3 py-2 text-right font-bold font-mono text-xs text-leads-blue">{totalDebit.toFixed(2)}</td>
                                                        <td className="px-3 py-2 text-right font-bold font-mono text-xs text-leads-blue">{totalCredit.toFixed(2)}</td>
                                                        <td colSpan={2} className="px-3 py-2 text-right text-xs">
                                                            {isBalanced
                                                                ? <span className="text-green-600 font-semibold flex items-center gap-1 justify-end"><Check size={12} /> Balanced</span>
                                                                : <span className="text-red-600 font-semibold flex items-center gap-1 justify-end"><X size={12} /> Imbalanced</span>}
                                                        </td>
                                                    </tr>
                                                </tfoot>
                                            </table>
                                        </div>
                                    </div>

                                    {error && <div className="text-red-600 text-xs bg-red-50 rounded-lg px-3 py-2">{error}</div>}
                                </form>
                            </div>
                            <div className="border-t border-gray-100 p-5 flex gap-3">
                                <button type="button" onClick={() => setShowModal(false)}
                                    className="flex-1 border border-gray-200 rounded-lg py-2 text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
                                <button form="" onClick={handleSubmit} disabled={!isBalanced || saving}
                                    className="flex-1 bg-leads-blue text-white rounded-lg py-2 text-sm font-medium hover:bg-blue-800 disabled:opacity-50 flex items-center justify-center gap-2">
                                    {saving ? <><Loader2 size={14} className="animate-spin" /> Saving...</> : <><Check size={14} /> Save as Draft</>}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* JE Detail Modal */}
            <AnimatePresence>
                {(detailEntry || detailLoading) && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden">
                            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                                <div>
                                    {detailEntry ? (
                                        <>
                                            <h2 className="font-bold text-leads-blue text-lg">{detailEntry.entryNumber}</h2>
                                            <p className="text-xs text-gray-400 mt-0.5">{detailEntry.description} · {new Date(detailEntry.entryDate).toLocaleDateString('en-PK')}</p>
                                        </>
                                    ) : <h2 className="font-bold text-leads-blue">Loading…</h2>}
                                </div>
                                <button onClick={() => { setDetailEntry(null); setDetailLoading(false); }} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
                            </div>
                            <div className="px-6 py-5">
                                {detailLoading && <div className="py-10 text-center"><Loader2 size={24} className="animate-spin mx-auto text-gray-400" /></div>}
                                {detailEntry && (
                                    <>
                                        <div className="flex flex-wrap gap-3 mb-4">
                                            {[{ label: 'Source', value: detailEntry.source }, { label: 'Status', value: detailEntry.status }, { label: 'Created By', value: detailEntry.createdBy || '—' }].map(m => (
                                                <div key={m.label} className="bg-gray-50 rounded-lg px-3 py-2 text-xs">
                                                    <p className="text-gray-400 uppercase tracking-wider text-[10px]">{m.label}</p>
                                                    <p className={`font-semibold mt-0.5 ${m.label === 'Status' ? (statusColors[m.value] || 'text-gray-700') : 'text-gray-700'}`}>{m.value.replace(/_/g, ' ')}</p>
                                                </div>
                                            ))}
                                        </div>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">All Accounts Involved</p>
                                        <div className="border border-gray-100 rounded-xl overflow-hidden">
                                            <table className="w-full text-xs">
                                                <thead className="bg-gray-50 border-b border-gray-100">
                                                    <tr>
                                                        <th className="text-left px-4 py-2.5 font-semibold text-gray-500">Code</th>
                                                        <th className="text-left px-4 py-2.5 font-semibold text-gray-500">Account Name</th>
                                                        <th className="text-left px-4 py-2.5 font-semibold text-gray-500">Narration</th>
                                                        <th className="text-right px-4 py-2.5 font-semibold text-gray-500">Debit</th>
                                                        <th className="text-right px-4 py-2.5 font-semibold text-gray-500">Credit</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-50">
                                                    {detailEntry.lines.map((line, li) => (
                                                        <tr key={li} className="hover:bg-blue-50/20">
                                                            <td className="px-4 py-2.5 font-mono font-bold text-leads-blue">{line.accountCode}</td>
                                                            <td className="px-4 py-2.5 text-gray-700">{line.accountName}</td>
                                                            <td className="px-4 py-2.5 text-gray-400 italic">{line.narration || '—'}</td>
                                                            <td className="px-4 py-2.5 text-right font-mono">{line.debit > 0 ? <span className="text-blue-700 font-semibold">{line.debit.toLocaleString('en-PK', { minimumFractionDigits: 2 })}</span> : <span className="text-gray-300">—</span>}</td>
                                                            <td className="px-4 py-2.5 text-right font-mono">{line.credit > 0 ? <span className="text-orange-700 font-semibold">{line.credit.toLocaleString('en-PK', { minimumFractionDigits: 2 })}</span> : <span className="text-gray-300">—</span>}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                                <tfoot className="bg-gray-50 border-t border-gray-100">
                                                    <tr>
                                                        <td colSpan={3} className="px-4 py-2 font-bold text-xs text-gray-600">TOTALS</td>
                                                        <td className="px-4 py-2 text-right font-bold font-mono text-blue-700">{detailEntry.totalDebit.toLocaleString('en-PK', { minimumFractionDigits: 2 })}</td>
                                                        <td className="px-4 py-2 text-right font-bold font-mono text-orange-700">{detailEntry.totalCredit.toLocaleString('en-PK', { minimumFractionDigits: 2 })}</td>
                                                    </tr>
                                                </tfoot>
                                            </table>
                                        </div>
                                        <div className={`mt-3 flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-lg ${detailEntry.totalDebit === detailEntry.totalCredit ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                                            {detailEntry.totalDebit === detailEntry.totalCredit ? '✓ Balanced — debits equal credits' : '⚠ Unbalanced entry'}
                                        </div>
                                    </>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
