'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, Plus, Loader2, X, Check } from 'lucide-react';

interface PO {
    _id: string; poNumber: string;
    vendor: { companyName: string; vendorCode: string };
    purchaseRequest?: { prNumber: string; title: string };
    items: Array<{ itemDescription: string; quantity: number; unit: string; unitPrice: number; gstPercentage: number }>;
    subtotal: number; gstAmount: number; totalAmount: number;
    status: string; expectedDeliveryDate?: string; createdAt: string;
}

interface Vendor { _id: string; companyName: string; vendorCode: string; }

const statusColors: Record<string, string> = {
    DRAFT: 'bg-gray-100 text-gray-700',
    SENT: 'bg-blue-100 text-blue-700',
    ACKNOWLEDGED: 'bg-yellow-100 text-yellow-700',
    PARTIALLY_DELIVERED: 'bg-orange-100 text-orange-700',
    DELIVERED: 'bg-green-100 text-green-700',
    CANCELLED: 'bg-red-100 text-red-600',
};

export default function PurchaseOrdersPage() {
    const [orders, setOrders] = useState<PO[]>([]);
    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('');
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [form, setForm] = useState({
        vendorId: '', expectedDeliveryDate: '',
        items: [{ itemDescription: '', quantity: 1, unit: 'Unit', unitPrice: 0, gstPercentage: 0 }],
    });

    const fetchOrders = (status = '') => {
        setLoading(true);
        const qs = status ? `?status=${status}` : '';
        fetch(`/api/finance/purchase-orders${qs}`)
            .then(r => r.json()).then(d => setOrders(Array.isArray(d) ? d : []))
            .finally(() => setLoading(false));
    };

    useEffect(() => { fetchOrders(filterStatus); }, [filterStatus]);
    useEffect(() => { fetch('/api/finance/vendors').then(r => r.json()).then(d => setVendors(Array.isArray(d) ? d : [])); }, []);

    const addItem = () => setForm({ ...form, items: [...form.items, { itemDescription: '', quantity: 1, unit: 'Unit', unitPrice: 0, gstPercentage: 0 }] });
    const removeItem = (i: number) => setForm({ ...form, items: form.items.filter((_, idx) => idx !== i) });
    const updateItem = (i: number, field: string, val: string | number) => {
        const items = [...form.items];
        items[i] = { ...items[i], [field]: val };
        setForm({ ...form, items });
    };

    const subtotal = form.items.reduce((s, i) => s + (i.quantity * i.unitPrice), 0);
    const gstTotal = form.items.reduce((s, i) => s + (i.gstPercentage / 100 * i.unitPrice * i.quantity), 0);
    const total = subtotal + gstTotal;

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault(); setSaving(true); setError(null);
        try {
            const res = await fetch('/api/finance/purchase-orders', {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setShowModal(false); fetchOrders(filterStatus);
            setForm({ vendorId: '', expectedDeliveryDate: '', items: [{ itemDescription: '', quantity: 1, unit: 'Unit', unitPrice: 0, gstPercentage: 0 }] });
        } catch (err: any) { setError(err.message); }
        finally { setSaving(false); }
    };

    return (
        <div className="space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h1 className="text-xl font-bold text-leads-blue flex items-center gap-2"><FileText size={22} /> Purchase Orders</h1>
                    <p className="text-xs text-gray-500 mt-0.5">Formal purchase orders to vendors · {orders.length} shown</p>
                </div>
                <button onClick={() => setShowModal(true)} className="flex items-center gap-2 bg-leads-blue text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-800 shadow-sm">
                    <Plus size={16} /> Create PO
                </button>
            </div>

            <div className="flex gap-2 flex-wrap">
                {['', 'DRAFT', 'SENT', 'ACKNOWLEDGED', 'PARTIALLY_DELIVERED', 'DELIVERED'].map(s => (
                    <button key={s} onClick={() => setFilterStatus(s)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filterStatus === s ? 'bg-leads-blue text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                        {s || 'All'}
                    </button>
                ))}
            </div>

            {loading ? <div className="py-16 text-center"><Loader2 className="animate-spin mx-auto text-gray-400" size={24} /></div>
                : orders.length === 0 ? (
                    <div className="bg-white rounded-xl border border-gray-200 py-16 text-center text-gray-400">
                        <FileText size={40} className="mx-auto mb-3 opacity-30" />
                        <p className="text-sm">No purchase orders found.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {orders.map((po, i) => (
                            <motion.div key={po._id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                                className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                                <button onClick={() => setExpandedId(expandedId === po._id ? null : po._id)}
                                    className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50/40 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className="p-2.5 bg-blue-50 rounded-lg"><FileText size={16} className="text-leads-blue" /></div>
                                        <div>
                                            <p className="font-semibold text-gray-900">{po.poNumber}</p>
                                            <p className="text-xs text-gray-500">{po.vendor?.companyName} · {po.items.length} line item{po.items.length !== 1 ? 's' : ''}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="text-right hidden sm:block">
                                            <p className="text-sm font-bold text-leads-blue">PKR {po.totalAmount.toLocaleString('en-PK')}</p>
                                            {po.expectedDeliveryDate && <p className="text-xs text-gray-400">Due: {new Date(po.expectedDeliveryDate).toLocaleDateString('en-PK')}</p>}
                                        </div>
                                        <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${statusColors[po.status]}`}>{po.status.replace(/_/g, ' ')}</span>
                                    </div>
                                </button>
                                {expandedId === po._id && (
                                    <div className="border-t border-gray-100 px-5 py-4">
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-xs">
                                                <thead className="bg-gray-50 border-b border-gray-100">
                                                    <tr>
                                                        <th className="text-left px-3 py-2 font-semibold text-gray-600">Item</th>
                                                        <th className="text-right px-3 py-2 font-semibold text-gray-600">Qty</th>
                                                        <th className="text-right px-3 py-2 font-semibold text-gray-600">Unit Price</th>
                                                        <th className="text-right px-3 py-2 font-semibold text-gray-600">GST%</th>
                                                        <th className="text-right px-3 py-2 font-semibold text-gray-600">Line Total</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-50">
                                                    {po.items.map((item, ii) => (
                                                        <tr key={ii}>
                                                            <td className="px-3 py-2 text-gray-700">{item.itemDescription}</td>
                                                            <td className="px-3 py-2 text-right">{item.quantity} {item.unit}</td>
                                                            <td className="px-3 py-2 text-right font-mono">{item.unitPrice.toLocaleString('en-PK')}</td>
                                                            <td className="px-3 py-2 text-right">{item.gstPercentage}%</td>
                                                            <td className="px-3 py-2 text-right font-mono font-semibold">
                                                                {(item.quantity * item.unitPrice * (1 + (item.gstPercentage || 0) / 100)).toLocaleString('en-PK')}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                                <tfoot className="border-t-2 border-gray-200">
                                                    <tr>
                                                        <td colSpan={3} className="px-3 py-2 text-[10px] text-gray-400">Subtotal: PKR {po.subtotal.toLocaleString('en-PK')} | GST: PKR {po.gstAmount.toLocaleString('en-PK')}</td>
                                                        <td colSpan={2} className="px-3 py-2 text-right font-bold text-leads-blue">Total: PKR {po.totalAmount.toLocaleString('en-PK')}</td>
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

            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm overflow-y-auto">
                    <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                        className="bg-white rounded-2xl shadow-2xl w-full max-w-xl my-4">
                        <div className="flex justify-between items-center p-5 border-b border-gray-100">
                            <h2 className="font-bold text-leads-blue">Create Purchase Order</h2>
                            <button onClick={() => setShowModal(false)}><X size={18} className="text-gray-400" /></button>
                        </div>
                        <form onSubmit={handleCreate} className="p-5 space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-semibold text-gray-600 mb-1 block">Vendor *</label>
                                    <select required value={form.vendorId} onChange={e => setForm({ ...form, vendorId: e.target.value })}
                                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-leads-blue">
                                        <option value="">-- Select Vendor --</option>
                                        {vendors.map(v => <option key={v._id} value={v._id}>{v.companyName}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-gray-600 mb-1 block">Expected Delivery</label>
                                    <input type="date" value={form.expectedDeliveryDate} onChange={e => setForm({ ...form, expectedDeliveryDate: e.target.value })}
                                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-leads-blue" />
                                </div>
                            </div>
                            {/* Items */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="text-xs font-bold text-gray-700 uppercase">Line Items</label>
                                    <button type="button" onClick={addItem} className="text-xs text-leads-blue hover:underline flex items-center gap-1"><Plus size={12} /> Add</button>
                                </div>
                                <div className="space-y-2">
                                    {form.items.map((item, i) => (
                                        <div key={i} className="grid grid-cols-12 gap-1">
                                            <input required value={item.itemDescription} onChange={e => updateItem(i, 'itemDescription', e.target.value)} placeholder="Description"
                                                className="col-span-4 border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-leads-blue" />
                                            <input type="number" min="1" value={item.quantity} onChange={e => updateItem(i, 'quantity', parseInt(e.target.value) || 1)}
                                                className="col-span-1 border border-gray-200 rounded px-2 py-1 text-xs text-center focus:outline-none focus:ring-1 focus:ring-leads-blue" placeholder="Qty" />
                                            <input type="number" min="0" step="1" value={item.unitPrice || ''} onChange={e => updateItem(i, 'unitPrice', parseFloat(e.target.value) || 0)} placeholder="Unit Price"
                                                className="col-span-3 border border-gray-200 rounded px-2 py-1 text-xs text-right focus:outline-none focus:ring-1 focus:ring-leads-blue" />
                                            <input type="number" min="0" max="100" step="1" value={item.gstPercentage || ''} onChange={e => updateItem(i, 'gstPercentage', parseFloat(e.target.value) || 0)} placeholder="GST%"
                                                className="col-span-2 border border-gray-200 rounded px-2 py-1 text-xs text-center focus:outline-none focus:ring-1 focus:ring-leads-blue" />
                                            <div className="col-span-1 flex items-center justify-center text-[10px] font-mono text-gray-500">
                                                {((item.quantity * item.unitPrice) * (1 + (item.gstPercentage || 0) / 100)).toLocaleString('en-PK', { maximumFractionDigits: 0 })}
                                            </div>
                                            {form.items.length > 1 && <button type="button" onClick={() => removeItem(i)} className="col-span-1 text-red-400 hover:text-red-600 flex items-center justify-center"><X size={12} /></button>}
                                        </div>
                                    ))}
                                </div>
                                <div className="flex justify-end gap-4 text-xs font-mono text-gray-600 mt-2">
                                    <span>Subtotal: PKR {subtotal.toLocaleString('en-PK')}</span>
                                    <span>GST: PKR {gstTotal.toLocaleString('en-PK')}</span>
                                    <span className="font-bold text-leads-blue">Total: PKR {total.toLocaleString('en-PK')}</span>
                                </div>
                            </div>
                            {error && <p className="text-red-600 text-xs bg-red-50 rounded px-3 py-2">{error}</p>}
                            <div className="flex gap-3">
                                <button type="button" onClick={() => setShowModal(false)} className="flex-1 border border-gray-200 rounded-lg py-2 text-sm">Cancel</button>
                                <button type="submit" disabled={saving || !form.vendorId} className="flex-1 bg-leads-blue text-white rounded-lg py-2 text-sm font-medium hover:bg-blue-800 disabled:opacity-50 flex items-center justify-center gap-2">
                                    {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Create PO
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}
        </div>
    );
}
