'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { PiggyBank, Plus, Loader2, X, Check, TrendingUp } from 'lucide-react';

interface FY { _id: string; name: string; }
interface BudgetLine { accountCode: string; accountName: string; budgetedAmount: number; }
interface Budget { _id: string; fiscalYear: { name: string }; budgetName: string; totalBudget: number; status: string; budgetLines: BudgetLine[]; allowOverspend: boolean; createdAt: string; }

export default function BudgetPage() {
    const [budgets, setBudgets] = useState<Budget[]>([]);
    const [fiscalYears, setFiscalYears] = useState<FY[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const [form, setForm] = useState({
        fiscalYear: '', budgetName: '', allowOverspend: false,
        budgetLines: [{ accountCode: '', accountName: '', budgetedAmount: 0 }],
    });

    const fetchData = () => {
        setLoading(true);
        Promise.all([
            fetch('/api/finance/budget').then(r => r.json()),
            fetch('/api/finance/fiscal-years').then(r => r.json()),
        ]).then(([b, f]) => { setBudgets(Array.isArray(b) ? b : []); setFiscalYears(Array.isArray(f) ? f : []); })
            .finally(() => setLoading(false));
    };

    useEffect(() => { fetchData(); }, []);

    const addLine = () => setForm({ ...form, budgetLines: [...form.budgetLines, { accountCode: '', accountName: '', budgetedAmount: 0 }] });
    const removeLine = (i: number) => setForm({ ...form, budgetLines: form.budgetLines.filter((_, idx) => idx !== i) });
    const updateLine = (i: number, field: string, val: string | number) => {
        const bl = [...form.budgetLines];
        bl[i] = { ...bl[i], [field]: val };
        setForm({ ...form, budgetLines: bl });
    };

    const totalBudget = form.budgetLines.reduce((s, l) => s + (Number(l.budgetedAmount) || 0), 0);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault(); setSaving(true); setError(null);
        try {
            const res = await fetch('/api/finance/budget', {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setShowModal(false); fetchData();
            setForm({ fiscalYear: '', budgetName: '', allowOverspend: false, budgetLines: [{ accountCode: '', accountName: '', budgetedAmount: 0 }] });
        } catch (err: any) { setError(err.message); }
        finally { setSaving(false); }
    };

    return (
        <div className="space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h1 className="text-xl font-bold text-leads-blue flex items-center gap-2"><PiggyBank size={22} /> Budget Management</h1>
                    <p className="text-xs text-gray-500 mt-0.5">Annual budget allocation by account · {budgets.length} budgets</p>
                </div>
                <button onClick={() => setShowModal(true)} className="flex items-center gap-2 bg-leads-blue text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-800 shadow-sm">
                    <Plus size={16} /> Create Budget
                </button>
            </div>

            {loading ? <div className="py-16 text-center"><Loader2 className="animate-spin mx-auto text-gray-400" size={24} /></div>
                : budgets.length === 0 ? (
                    <div className="bg-white rounded-xl border border-gray-200 py-16 text-center text-gray-400">
                        <PiggyBank size={40} className="mx-auto mb-3 opacity-30" />
                        <p className="text-sm">No budgets yet. Create a budget for a fiscal year to track spending.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {budgets.map((b, i) => (
                            <motion.div key={b._id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                                className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                                <button onClick={() => setExpandedId(expandedId === b._id ? null : b._id)}
                                    className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50/40 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className="p-2.5 bg-blue-50 rounded-lg"><PiggyBank size={18} className="text-leads-blue" /></div>
                                        <div>
                                            <p className="font-semibold text-gray-900">{b.budgetName}</p>
                                            <p className="text-xs text-gray-500">{b.fiscalYear?.name} · {b.budgetLines?.length} budget lines</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="text-right">
                                            <p className="text-sm font-bold text-leads-blue">PKR {b.totalBudget.toLocaleString('en-PK')}</p>
                                            {b.allowOverspend && <p className="text-[10px] text-yellow-600">Overspend allowed</p>}
                                        </div>
                                        <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${b.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{b.status}</span>
                                    </div>
                                </button>
                                {expandedId === b._id && (
                                    <div className="border-t border-gray-100 px-5 py-4">
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-xs">
                                                <thead className="bg-gray-50 border-b border-gray-100">
                                                    <tr>
                                                        <th className="text-left px-3 py-2 font-semibold text-gray-600">Account Code</th>
                                                        <th className="text-left px-3 py-2 font-semibold text-gray-600">Account Name</th>
                                                        <th className="text-right px-3 py-2 font-semibold text-gray-600">Budgeted (PKR)</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-50">
                                                    {b.budgetLines?.map((l, li) => (
                                                        <tr key={li}>
                                                            <td className="px-3 py-2 font-mono text-leads-blue">{l.accountCode}</td>
                                                            <td className="px-3 py-2 text-gray-700">{l.accountName}</td>
                                                            <td className="px-3 py-2 text-right font-mono font-semibold">{l.budgetedAmount.toLocaleString('en-PK')}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                                <tfoot className="border-t-2 border-gray-200">
                                                    <tr>
                                                        <td colSpan={2} className="px-3 py-2 font-bold text-gray-700">Total Budget</td>
                                                        <td className="px-3 py-2 text-right font-bold font-mono text-leads-blue">{b.totalBudget.toLocaleString('en-PK')}</td>
                                                    </tr>
                                                </tfoot>
                                            </table>
                                        </div>
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
                            <h2 className="font-bold text-leads-blue">Create Budget</h2>
                            <button onClick={() => setShowModal(false)}><X size={18} className="text-gray-400" /></button>
                        </div>
                        <form onSubmit={handleCreate} className="p-5 space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-semibold text-gray-600 mb-1 block">Fiscal Year *</label>
                                    <select required value={form.fiscalYear} onChange={e => setForm({ ...form, fiscalYear: e.target.value })}
                                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-leads-blue">
                                        <option value="">-- Select --</option>
                                        {fiscalYears.map(f => <option key={f._id} value={f._id}>{f.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-gray-600 mb-1 block">Budget Name *</label>
                                    <input required value={form.budgetName} onChange={e => setForm({ ...form, budgetName: e.target.value })}
                                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-leads-blue"
                                        placeholder="e.g. Annual Operations Budget" />
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <input type="checkbox" id="allowOverspend" checked={form.allowOverspend} onChange={e => setForm({ ...form, allowOverspend: e.target.checked })} className="w-4 h-4" />
                                <label htmlFor="allowOverspend" className="text-xs text-gray-600">Allow overspend (warn but don't block)</label>
                            </div>
                            {/* Budget Lines */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Budget Lines</label>
                                    <button type="button" onClick={addLine} className="text-xs text-leads-blue hover:underline flex items-center gap-1"><Plus size={12} /> Add Line</button>
                                </div>
                                <div className="border border-gray-200 rounded-xl overflow-hidden">
                                    <table className="w-full text-xs">
                                        <thead className="bg-gray-50 border-b border-gray-100">
                                            <tr>
                                                <th className="px-3 py-2 text-left font-semibold text-gray-600">A/c Code</th>
                                                <th className="px-3 py-2 text-left font-semibold text-gray-600">Account Name</th>
                                                <th className="px-3 py-2 text-right font-semibold text-gray-600">Budget (PKR)</th>
                                                <th className="w-8" />
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50">
                                            {form.budgetLines.map((l, i) => (
                                                <tr key={i}>
                                                    <td className="px-2 py-1.5">
                                                        <input value={l.accountCode} onChange={e => updateLine(i, 'accountCode', e.target.value)}
                                                            className="w-full font-mono border-0 bg-transparent focus:outline-none focus:ring-1 focus:ring-leads-blue rounded px-1 text-xs"
                                                            placeholder="e.g. 6001" />
                                                    </td>
                                                    <td className="px-2 py-1.5">
                                                        <input value={l.accountName} onChange={e => updateLine(i, 'accountName', e.target.value)}
                                                            className="w-full border-0 bg-transparent focus:outline-none focus:ring-1 focus:ring-leads-blue rounded px-1 text-xs"
                                                            placeholder="Account name" />
                                                    </td>
                                                    <td className="px-2 py-1.5">
                                                        <input type="number" step="1" min="0" value={l.budgetedAmount || ''}
                                                            onChange={e => updateLine(i, 'budgetedAmount', parseFloat(e.target.value) || 0)}
                                                            className="w-full text-right border-0 bg-transparent focus:outline-none focus:ring-1 focus:ring-leads-blue rounded px-1 text-xs"
                                                            placeholder="0" />
                                                    </td>
                                                    <td className="px-1 py-1.5 text-center">
                                                        {form.budgetLines.length > 1 && (
                                                            <button type="button" onClick={() => removeLine(i)} className="text-red-400 hover:text-red-600"><X size={12} /></button>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                                            <tr>
                                                <td colSpan={2} className="px-3 py-2 font-bold text-gray-700 text-xs">Total Budget</td>
                                                <td className="px-3 py-2 text-right font-bold font-mono text-xs text-leads-blue">PKR {totalBudget.toLocaleString('en-PK')}</td>
                                                <td />
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </div>
                            {error && <p className="text-red-600 text-xs bg-red-50 rounded px-3 py-2">{error}</p>}
                            <div className="flex gap-3 pt-1">
                                <button type="button" onClick={() => setShowModal(false)} className="flex-1 border border-gray-200 rounded-lg py-2 text-sm">Cancel</button>
                                <button type="submit" disabled={saving || !form.fiscalYear}
                                    className="flex-1 bg-leads-blue text-white rounded-lg py-2 text-sm font-medium hover:bg-blue-800 disabled:opacity-50 flex items-center justify-center gap-2">
                                    {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Create Budget
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}
        </div>
    );
}
