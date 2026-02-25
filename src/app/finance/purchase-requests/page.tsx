'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ShoppingBag, Plus, Loader2, X, Check, Clock, CheckCircle, XCircle } from 'lucide-react';

interface PR {
    _id: string; prNumber: string; title: string; department: string;
    requiredDate: string; totalEstimatedCost: number; status: string;
    justification?: string; requestedBy: string; createdAt: string;
    items: Array<{ itemDescription: string; quantity: number; unit: string; estimatedUnitCost: number }>;
}

const statusColors: Record<string, string> = {
    DRAFT: 'bg-gray-100 text-gray-700',
    PENDING_APPROVAL: 'bg-yellow-100 text-yellow-700',
    APPROVED: 'bg-green-100 text-green-700',
    REJECTED: 'bg-red-100 text-red-700',
    CONVERTED_TO_PO: 'bg-blue-100 text-blue-700',
};

const departments = ['Finance', 'Academic', 'IT', 'Library', 'Administration', 'HR', 'Security', 'Maintenance'];

export default function PurchaseRequestsPage() {
    const [prs, setPRs] = useState<PR[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('');
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [form, setForm] = useState({
        title: '', department: '', requiredDate: '', justification: '',
        items: [{ itemDescription: '', quantity: 1, unit: 'Unit', estimatedUnitCost: 0 }],
    });

    const fetchPRs = (status = '') => {
        setLoading(true);
        const qs = status ? `?status=${status}` : '';
        fetch(`/api/finance/purchase-requests${qs}`)
            .then(r => r.json()).then(d => setPRs(Array.isArray(d) ? d : []))
            .finally(() => setLoading(false));
    };

    useEffect(() => { fetchPRs(filterStatus); }, [filterStatus]);

    const addItem = () => setForm({ ...form, items: [...form.items, { itemDescription: '', quantity: 1, unit: 'Unit', estimatedUnitCost: 0 }] });
    const removeItem = (i: number) => setForm({ ...form, items: form.items.filter((_, idx) => idx !== i) });
    const updateItem = (i: number, field: string, val: string | number) => {
        const items = [...form.items];
        items[i] = { ...items[i], [field]: val };
        setForm({ ...form, items });
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault(); setSaving(true); setError(null);
        try {
            const res = await fetch('/api/finance/purchase-requests', {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setShowModal(false); fetchPRs(filterStatus);
            setForm({ title: '', department: '', requiredDate: '', justification: '', items: [{ itemDescription: '', quantity: 1, unit: 'Unit', estimatedUnitCost: 0 }] });
        } catch (err: any) { setError(err.message); }
        finally { setSaving(false); }
    };

    const handleAction = async (prId: string, action: string) => {
        const reason = action === 'REJECT' ? prompt('Reason for rejection (optional):') || 'Rejected' : undefined;
        try {
            const res = await fetch(`/api/finance/purchase-requests/${prId}`, {
                method: 'PATCH', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action, rejectionReason: reason }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            fetchPRs(filterStatus);
        } catch (err: any) { alert(err.message); }
    };

    const totalCost = form.items.reduce((s, i) => s + (i.quantity * i.estimatedUnitCost), 0);

    return (
        <div className="space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h1 className="text-xl font-bold text-leads-blue flex items-center gap-2"><ShoppingBag size={22} /> Purchase Requests</h1>
                    <p className="text-xs text-gray-500 mt-0.5">Procurement approval workflow · {prs.length} shown</p>
                </div>
                <button onClick={() => setShowModal(true)} className="flex items-center gap-2 bg-leads-blue text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-800 shadow-sm">
                    <Plus size={16} /> New PR
                </button>
            </div>

            <div className="flex gap-2 flex-wrap">
                {['', 'DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED'].map(s => (
                    <button key={s} onClick={() => setFilterStatus(s)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filterStatus === s ? 'bg-leads-blue text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                        {s || 'All'}
                    </button>
                ))}
            </div>

            {loading ? <div className="py-16 text-center"><Loader2 className="animate-spin mx-auto text-gray-400" size={24} /></div>
                : prs.length === 0 ? (
                    <div className="bg-white rounded-xl border border-gray-200 py-16 text-center text-gray-400">
                        <ShoppingBag size={40} className="mx-auto mb-3 opacity-30" />
                        <p className="text-sm">No purchase requests found.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {prs.map((pr, i) => (
                            <motion.div key={pr._id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                                className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                                <button onClick={() => setExpandedId(expandedId === pr._id ? null : pr._id)}
                                    className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50/40 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className="p-2.5 bg-blue-50 rounded-lg"><ShoppingBag size={16} className="text-leads-blue" /></div>
                                        <div>
                                            <p className="font-semibold text-gray-900">{pr.title}</p>
                                            <p className="text-xs text-gray-500">{pr.prNumber} · {pr.department} · by {pr.requestedBy}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="text-right hidden sm:block">
                                            <p className="text-sm font-bold text-leads-blue">PKR {pr.totalEstimatedCost.toLocaleString('en-PK')}</p>
                                            <p className="text-xs text-gray-400">Due: {new Date(pr.requiredDate).toLocaleDateString('en-PK')}</p>
                                        </div>
                                        <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${statusColors[pr.status]}`}>{pr.status.replace(/_/g, ' ')}</span>
                                    </div>
                                </button>

                                {expandedId === pr._id && (
                                    <div className="border-t border-gray-100 px-5 py-4 space-y-4">
                                        {pr.justification && <p className="text-xs text-gray-500 italic">"{pr.justification}"</p>}
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-xs border-collapse">
                                                <thead className="bg-gray-50 border-b border-gray-200">
                                                    <tr>
                                                        <th className="text-left px-3 py-2 font-semibold text-gray-600">Item</th>
                                                        <th className="text-right px-3 py-2 font-semibold text-gray-600">Qty</th>
                                                        <th className="text-left px-3 py-2 font-semibold text-gray-600">Unit</th>
                                                        <th className="text-right px-3 py-2 font-semibold text-gray-600">Unit Cost</th>
                                                        <th className="text-right px-3 py-2 font-semibold text-gray-600">Total</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-50">
                                                    {pr.items.map((item, ii) => (
                                                        <tr key={ii}>
                                                            <td className="px-3 py-2 text-gray-700">{item.itemDescription}</td>
                                                            <td className="px-3 py-2 text-right">{item.quantity}</td>
                                                            <td className="px-3 py-2 text-gray-500">{item.unit}</td>
                                                            <td className="px-3 py-2 text-right font-mono">{item.estimatedUnitCost.toLocaleString('en-PK')}</td>
                                                            <td className="px-3 py-2 text-right font-mono font-semibold">{(item.quantity * item.estimatedUnitCost).toLocaleString('en-PK')}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                        <div className="flex gap-2">
                                            {pr.status === 'DRAFT' && (
                                                <button onClick={() => handleAction(pr._id, 'SUBMIT')}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-50 text-yellow-700 rounded-lg text-xs font-medium hover:bg-yellow-100">
                                                    <Clock size={12} /> Submit for Approval
                                                </button>
                                            )}
                                            {pr.status === 'PENDING_APPROVAL' && (
                                                <>
                                                    <button onClick={() => handleAction(pr._id, 'APPROVE')}
                                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 rounded-lg text-xs font-medium hover:bg-green-100">
                                                        <CheckCircle size={12} /> Approve
                                                    </button>
                                                    <button onClick={() => handleAction(pr._id, 'REJECT')}
                                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-700 rounded-lg text-xs font-medium hover:bg-red-100">
                                                        <XCircle size={12} /> Reject
                                                    </button>
                                                </>
                                            )}
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
                            <h2 className="font-bold text-leads-blue">New Purchase Request</h2>
                            <button onClick={() => setShowModal(false)}><X size={18} className="text-gray-400" /></button>
                        </div>
                        <form onSubmit={handleCreate} className="p-5 space-y-4">
                            <div>
                                <label className="text-xs font-semibold text-gray-600 mb-1 block">Title *</label>
                                <input required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
                                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-leads-blue"
                                    placeholder="e.g. Office Chair for Finance Dept" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-semibold text-gray-600 mb-1 block">Department *</label>
                                    <select required value={form.department} onChange={e => setForm({ ...form, department: e.target.value })}
                                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-leads-blue">
                                        <option value="">-- Select --</option>
                                        {departments.map(d => <option key={d}>{d}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-gray-600 mb-1 block">Required By *</label>
                                    <input required type="date" value={form.requiredDate} onChange={e => setForm({ ...form, requiredDate: e.target.value })}
                                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-leads-blue" />
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-gray-600 mb-1 block">Justification</label>
                                <textarea rows={2} value={form.justification} onChange={e => setForm({ ...form, justification: e.target.value })}
                                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-leads-blue"
                                    placeholder="Business need or reason..." />
                            </div>
                            {/* Items */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Items</label>
                                    <button type="button" onClick={addItem} className="text-xs text-leads-blue hover:underline flex items-center gap-1"><Plus size={12} /> Add Item</button>
                                </div>
                                <div className="space-y-2">
                                    {form.items.map((item, i) => (
                                        <div key={i} className="flex gap-2">
                                            <input required value={item.itemDescription} onChange={e => updateItem(i, 'itemDescription', e.target.value)} placeholder="Item description"
                                                className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-leads-blue" />
                                            <input type="number" min="1" value={item.quantity} onChange={e => updateItem(i, 'quantity', parseInt(e.target.value) || 1)} placeholder="Qty"
                                                className="w-14 border border-gray-200 rounded-lg px-2 py-1.5 text-xs text-center focus:outline-none focus:ring-1 focus:ring-leads-blue" />
                                            <input type="number" min="0" step="1" value={item.estimatedUnitCost || ''} onChange={e => updateItem(i, 'estimatedUnitCost', parseFloat(e.target.value) || 0)} placeholder="Cost"
                                                className="w-24 border border-gray-200 rounded-lg px-2 py-1.5 text-xs text-right focus:outline-none focus:ring-1 focus:ring-leads-blue" />
                                            {form.items.length > 1 && <button type="button" onClick={() => removeItem(i)} className="text-red-400 hover:text-red-600"><X size={14} /></button>}
                                        </div>
                                    ))}
                                </div>
                                <p className="text-right text-xs font-mono text-leads-blue mt-2">Estimated Total: PKR {totalCost.toLocaleString('en-PK')}</p>
                            </div>
                            {error && <p className="text-red-600 text-xs bg-red-50 rounded px-3 py-2">{error}</p>}
                            <div className="flex gap-3">
                                <button type="button" onClick={() => setShowModal(false)} className="flex-1 border border-gray-200 rounded-lg py-2 text-sm">Cancel</button>
                                <button type="submit" disabled={saving} className="flex-1 bg-leads-blue text-white rounded-lg py-2 text-sm font-medium hover:bg-blue-800 flex items-center justify-center gap-2">
                                    {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Submit PR
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}
        </div>
    );
}
