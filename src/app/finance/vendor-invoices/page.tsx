'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, Plus, Loader2, X, Check, AlertCircle } from 'lucide-react';

interface VI {
    _id: string; internalReference: string; vendorInvoiceNumber: string;
    vendor: { companyName: string; vendorCode: string };
    invoiceDate: string; dueDate: string;
    subtotal: number; taxAmount: number; totalAmount: number;
    paidAmount: number; outstandingAmount: number; status: string;
    description?: string;
}

const statusColors: Record<string, string> = {
    PENDING: 'bg-gray-100 text-gray-700',
    APPROVED: 'bg-blue-100 text-blue-700',
    PARTIALLY_PAID: 'bg-yellow-100 text-yellow-700',
    PAID: 'bg-green-100 text-green-700',
    DISPUTED: 'bg-red-100 text-red-700',
    CANCELLED: 'bg-gray-100 text-gray-400',
};

interface Vendor { _id: string; companyName: string; vendorCode: string; }

export default function VendorInvoicesPage() {
    const [invoices, setInvoices] = useState<VI[]>([]);
    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [form, setForm] = useState({
        vendorId: '', vendorInvoiceNumber: '', invoiceDate: '', dueDate: '',
        description: '', subtotal: 0, taxAmount: 0,
        expenseAccountCode: '6001', payableAccountCode: '2001',
    });

    const fetchInvoices = (status = '') => {
        setLoading(true);
        const qs = status ? `?status=${status}` : '';
        fetch(`/api/finance/vendor-invoices${qs}`)
            .then(r => r.json()).then(d => setInvoices(Array.isArray(d) ? d : []))
            .finally(() => setLoading(false));
    };

    useEffect(() => { fetchInvoices(filterStatus); }, [filterStatus]);
    useEffect(() => { fetch('/api/finance/vendors').then(r => r.json()).then(d => setVendors(Array.isArray(d) ? d : [])); }, []);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault(); setSaving(true); setError(null);
        try {
            const res = await fetch('/api/finance/vendor-invoices', {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setShowModal(false); fetchInvoices(filterStatus);
            setForm({ vendorId: '', vendorInvoiceNumber: '', invoiceDate: '', dueDate: '', description: '', subtotal: 0, taxAmount: 0, expenseAccountCode: '6001', payableAccountCode: '2001' });
        } catch (err: any) { setError(err.message); }
        finally { setSaving(false); }
    };

    const total = form.subtotal + form.taxAmount;

    return (
        <div className="space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h1 className="text-xl font-bold text-leads-blue flex items-center gap-2"><FileText size={22} /> Vendor Invoices</h1>
                    <p className="text-xs text-gray-500 mt-0.5">Accounts Payable · {invoices.length} shown</p>
                </div>
                <button onClick={() => setShowModal(true)} className="flex items-center gap-2 bg-leads-blue text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-800 shadow-sm">
                    <Plus size={16} /> Record Invoice
                </button>
            </div>

            <div className="flex gap-2 flex-wrap">
                {['', 'PENDING', 'APPROVED', 'PARTIALLY_PAID', 'PAID', 'DISPUTED'].map(s => (
                    <button key={s} onClick={() => setFilterStatus(s)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filterStatus === s ? 'bg-leads-blue text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                        {s || 'All'}
                    </button>
                ))}
            </div>

            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 border-b border-gray-100 text-xs uppercase text-gray-500 font-semibold">
                            <tr>
                                <th className="px-4 py-3">Ref</th>
                                <th className="px-4 py-3">Vendor Inv #</th>
                                <th className="px-4 py-3">Vendor</th>
                                <th className="px-4 py-3">Invoice Date</th>
                                <th className="px-4 py-3">Due Date</th>
                                <th className="px-4 py-3 text-right">Total</th>
                                <th className="px-4 py-3 text-right">Paid</th>
                                <th className="px-4 py-3 text-right">Outstanding</th>
                                <th className="px-4 py-3 text-center">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {loading ? <tr><td colSpan={9} className="py-12 text-center"><Loader2 className="animate-spin mx-auto text-gray-400" size={22} /></td></tr>
                                : invoices.length === 0 ? <tr><td colSpan={9} className="py-12 text-center text-gray-400 text-sm"><FileText size={36} className="mx-auto mb-2 opacity-30" />No vendor invoices found.</td></tr>
                                    : invoices.map((inv, i) => (
                                        <motion.tr key={inv._id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}
                                            className={`hover:bg-blue-50/20 transition-colors ${new Date() > new Date(inv.dueDate) && inv.status !== 'PAID' ? 'bg-red-50/20' : ''}`}>
                                            <td className="px-4 py-3 font-mono text-xs font-semibold text-leads-blue">{inv.internalReference}</td>
                                            <td className="px-4 py-3 text-xs font-mono text-gray-600">{inv.vendorInvoiceNumber}</td>
                                            <td className="px-4 py-3">
                                                <p className="text-sm font-medium text-gray-800">{inv.vendor?.companyName}</p>
                                                <p className="text-xs text-gray-400">{inv.vendor?.vendorCode}</p>
                                            </td>
                                            <td className="px-4 py-3 text-xs text-gray-500">{new Date(inv.invoiceDate).toLocaleDateString('en-PK')}</td>
                                            <td className="px-4 py-3 text-xs text-gray-500 flex items-center gap-1">
                                                {new Date() > new Date(inv.dueDate) && inv.status !== 'PAID' && <AlertCircle size={11} className="text-red-400 flex-shrink-0" />}
                                                {new Date(inv.dueDate).toLocaleDateString('en-PK')}
                                            </td>
                                            <td className="px-4 py-3 text-right font-mono text-xs">{inv.totalAmount.toLocaleString('en-PK')}</td>
                                            <td className="px-4 py-3 text-right font-mono text-xs text-green-700">{inv.paidAmount.toLocaleString('en-PK')}</td>
                                            <td className="px-4 py-3 text-right font-mono text-xs font-bold text-leads-red">{inv.outstandingAmount.toLocaleString('en-PK')}</td>
                                            <td className="px-4 py-3 text-center"><span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusColors[inv.status]}`}>{inv.status.replace(/_/g, ' ')}</span></td>
                                        </motion.tr>
                                    ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm overflow-y-auto">
                    <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg my-4">
                        <div className="flex justify-between items-center p-5 border-b border-gray-100">
                            <h2 className="font-bold text-leads-blue">Record Vendor Invoice</h2>
                            <button onClick={() => setShowModal(false)}><X size={18} className="text-gray-400" /></button>
                        </div>
                        <form onSubmit={handleCreate} className="p-5 space-y-3">
                            <div>
                                <label className="text-xs font-semibold text-gray-600 mb-1 block">Vendor *</label>
                                <select required value={form.vendorId} onChange={e => setForm({ ...form, vendorId: e.target.value })}
                                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-leads-blue">
                                    <option value="">-- Select Vendor --</option>
                                    {vendors.map(v => <option key={v._id} value={v._id}>{v.companyName} ({v.vendorCode})</option>)}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-semibold text-gray-600 mb-1 block">Vendor Invoice # *</label>
                                    <input required value={form.vendorInvoiceNumber} onChange={e => setForm({ ...form, vendorInvoiceNumber: e.target.value })}
                                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-leads-blue" placeholder="e.g. INV-3021" />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-gray-600 mb-1 block">Invoice Date *</label>
                                    <input required type="date" value={form.invoiceDate} onChange={e => setForm({ ...form, invoiceDate: e.target.value })}
                                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-leads-blue" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-semibold text-gray-600 mb-1 block">Due Date *</label>
                                    <input required type="date" value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })}
                                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-leads-blue" />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-gray-600 mb-1 block">Subtotal (PKR) *</label>
                                    <input required type="number" step="0.01" min="0" value={form.subtotal || ''}
                                        onChange={e => setForm({ ...form, subtotal: parseFloat(e.target.value) || 0 })}
                                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-leads-blue" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-semibold text-gray-600 mb-1 block">GST/Tax (PKR)</label>
                                    <input type="number" step="0.01" min="0" value={form.taxAmount || ''}
                                        onChange={e => setForm({ ...form, taxAmount: parseFloat(e.target.value) || 0 })}
                                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-leads-blue" />
                                </div>
                                <div className="flex items-end pb-2">
                                    <p className="text-xs font-mono text-leads-blue font-bold">Total: PKR {total.toLocaleString('en-PK')}</p>
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-gray-600 mb-1 block">Description</label>
                                <textarea rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-leads-blue"
                                    placeholder="Services/goods description..." />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-semibold text-gray-600 mb-1 block">Expense A/c Code *</label>
                                    <input required value={form.expenseAccountCode} onChange={e => setForm({ ...form, expenseAccountCode: e.target.value })}
                                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-leads-blue" />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-gray-600 mb-1 block">Payable A/c Code *</label>
                                    <input required value={form.payableAccountCode} onChange={e => setForm({ ...form, payableAccountCode: e.target.value })}
                                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-leads-blue" />
                                </div>
                            </div>
                            <p className="text-[10px] text-gray-400">A journal entry (DR Expense / CR Accounts Payable) will be auto-posted on creation.</p>
                            {error && <p className="text-red-600 text-xs bg-red-50 rounded px-3 py-2">{error}</p>}
                            <div className="flex gap-3 pt-1">
                                <button type="button" onClick={() => setShowModal(false)} className="flex-1 border border-gray-200 rounded-lg py-2 text-sm">Cancel</button>
                                <button type="submit" disabled={saving} className="flex-1 bg-leads-blue text-white rounded-lg py-2 text-sm font-medium hover:bg-blue-800 flex items-center justify-center gap-2">
                                    {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Record & Post JE
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}
        </div>
    );
}
