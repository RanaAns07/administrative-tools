'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Users, Plus, Loader2, X, Check, IndianRupee, Clock } from 'lucide-react';

interface Invoice {
    _id: string; invoiceNumber: string; studentName: string; rollNumber: string;
    program: string; semester: string; totalAmount: number; paidAmount: number;
    outstandingAmount: number; dueDate: string; status: string;
}

const statusColors: Record<string, string> = {
    UNPAID: 'bg-gray-100 text-gray-700', PARTIAL: 'bg-yellow-100 text-yellow-700',
    PAID: 'bg-green-100 text-green-700', OVERDUE: 'bg-red-100 text-red-700',
    WRITTEN_OFF: 'bg-purple-100 text-purple-700', CANCELLED: 'bg-gray-100 text-gray-400',
};

interface FeeStructure { _id: string; programName: string; semester: string; academicYear: string; totalAmount: number; }

export default function FeeInvoicesPage() {
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [showPayModal, setShowPayModal] = useState<Invoice | null>(null);
    const [structures, setStructures] = useState<FeeStructure[]>([]);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [form, setForm] = useState({ studentId: '', studentName: '', rollNumber: '', feeStructureId: '', dueDate: '' });
    const [payForm, setPayForm] = useState({ amount: 0, paymentMode: 'CASH', paymentDate: new Date().toISOString().split('T')[0] });

    const fetchInvoices = (status = '') => {
        setLoading(true);
        const qs = status ? `?status=${status}` : '';
        fetch(`/api/finance/fee-invoices${qs}`)
            .then(r => r.json()).then(d => { setInvoices(d.invoices || []); setTotal(d.total || 0); })
            .catch(e => setError(e.message)).finally(() => setLoading(false));
    };

    useEffect(() => { fetchInvoices(filterStatus); }, [filterStatus]);
    useEffect(() => { fetch('/api/finance/fee-structures').then(r => r.json()).then(setStructures); }, []);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault(); setSaving(true); setError(null);
        try {
            const res = await fetch('/api/finance/fee-invoices', {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setShowModal(false); fetchInvoices(filterStatus);
            setForm({ studentId: '', studentName: '', rollNumber: '', feeStructureId: '', dueDate: '' });
        } catch (err: any) { setError(err.message); }
        finally { setSaving(false); }
    };

    const handlePayment = async (e: React.FormEvent) => {
        e.preventDefault(); if (!showPayModal) return;
        setSaving(true); setError(null);
        try {
            const res = await fetch('/api/finance/fee-payments', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ feeInvoiceId: showPayModal._id, ...payForm }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setShowPayModal(null); fetchInvoices(filterStatus);
        } catch (err: any) { setError(err.message); }
        finally { setSaving(false); }
    };

    return (
        <div className="space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h1 className="text-xl font-bold text-leads-blue flex items-center gap-2"><Users size={22} /> Fee Invoices</h1>
                    <p className="text-xs text-gray-500 mt-0.5">Student fee billing · {total} invoices</p>
                </div>
                <button onClick={() => setShowModal(true)}
                    className="flex items-center gap-2 bg-leads-blue text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-800 shadow-sm">
                    <Plus size={16} /> New Invoice
                </button>
            </div>

            {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm flex gap-2">{error}<button className="ml-auto" onClick={() => setError(null)}><X size={12} /></button></div>}

            <div className="flex flex-wrap gap-2">
                {['', 'UNPAID', 'PARTIAL', 'PAID', 'OVERDUE'].map(s => (
                    <button key={s} onClick={() => setFilterStatus(s)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filterStatus === s ? 'bg-leads-blue text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                        {s || 'All'}
                    </button>
                ))}
            </div>

            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 border-b border-gray-100 text-xs uppercase text-gray-500 font-semibold tracking-wider">
                            <tr>
                                <th className="px-4 py-3">Invoice #</th>
                                <th className="px-4 py-3">Student</th>
                                <th className="px-4 py-3">Roll #</th>
                                <th className="px-4 py-3">Program</th>
                                <th className="px-4 py-3 text-right">Total</th>
                                <th className="px-4 py-3 text-right">Paid</th>
                                <th className="px-4 py-3 text-right">Outstanding</th>
                                <th className="px-4 py-3">Due Date</th>
                                <th className="px-4 py-3 text-center">Status</th>
                                <th className="px-4 py-3 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {loading ? (
                                <tr><td colSpan={10} className="py-12 text-center"><Loader2 className="animate-spin mx-auto text-gray-400" size={22} /></td></tr>
                            ) : invoices.length === 0 ? (
                                <tr><td colSpan={10} className="py-10 text-center text-gray-400 text-sm">No fee invoices found.</td></tr>
                            ) : invoices.map((inv, i) => (
                                <motion.tr key={inv._id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}
                                    className="hover:bg-blue-50/20 transition-colors">
                                    <td className="px-4 py-3 font-mono text-xs font-semibold text-leads-blue">{inv.invoiceNumber}</td>
                                    <td className="px-4 py-3 font-medium text-gray-800 text-sm">{inv.studentName}</td>
                                    <td className="px-4 py-3 text-xs text-gray-600">{inv.rollNumber}</td>
                                    <td className="px-4 py-3 text-xs text-gray-500 max-w-[120px] truncate">{inv.program}</td>
                                    <td className="px-4 py-3 text-right font-mono text-xs">{inv.totalAmount.toLocaleString('en-PK')}</td>
                                    <td className="px-4 py-3 text-right font-mono text-xs text-green-700">{inv.paidAmount.toLocaleString('en-PK')}</td>
                                    <td className="px-4 py-3 text-right font-mono text-xs font-bold text-leads-red">{inv.outstandingAmount.toLocaleString('en-PK')}</td>
                                    <td className="px-4 py-3 text-xs text-gray-500 flex items-center gap-1">
                                        {new Date() > new Date(inv.dueDate) && inv.status !== 'PAID' && <Clock size={12} className="text-red-400" />}
                                        {new Date(inv.dueDate).toLocaleDateString('en-PK')}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusColors[inv.status]}`}>{inv.status}</span>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        {inv.status !== 'PAID' && inv.status !== 'CANCELLED' && (
                                            <button onClick={() => { setShowPayModal(inv); setPayForm({ amount: inv.outstandingAmount, paymentMode: 'CASH', paymentDate: new Date().toISOString().split('T')[0] }); }}
                                                className="text-xs bg-green-50 text-green-700 px-2.5 py-1 rounded-lg hover:bg-green-100 transition-colors flex items-center gap-1">
                                                <IndianRupee size={11} /> Pay
                                            </button>
                                        )}
                                    </td>
                                </motion.tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Create Invoice Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                    <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                        className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="font-bold text-leads-blue">New Fee Invoice</h2>
                            <button onClick={() => setShowModal(false)}><X size={18} className="text-gray-400" /></button>
                        </div>
                        <form onSubmit={handleCreate} className="space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div><label className="text-xs font-semibold text-gray-600 mb-1 block">Student ID</label>
                                    <input required value={form.studentId} onChange={e => setForm({ ...form, studentId: e.target.value })}
                                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-leads-blue" placeholder="LLU-2025-001" /></div>
                                <div><label className="text-xs font-semibold text-gray-600 mb-1 block">Roll Number</label>
                                    <input required value={form.rollNumber} onChange={e => setForm({ ...form, rollNumber: e.target.value })}
                                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-leads-blue" placeholder="CS-25-001" /></div>
                            </div>
                            <div><label className="text-xs font-semibold text-gray-600 mb-1 block">Student Name</label>
                                <input required value={form.studentName} onChange={e => setForm({ ...form, studentName: e.target.value })}
                                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-leads-blue" placeholder="Full Name" /></div>
                            <div><label className="text-xs font-semibold text-gray-600 mb-1 block">Fee Structure</label>
                                <select required value={form.feeStructureId} onChange={e => setForm({ ...form, feeStructureId: e.target.value })}
                                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-leads-blue">
                                    <option value="">-- Select Fee Structure --</option>
                                    {structures.map(s => <option key={s._id} value={s._id}>{s.programName} · {s.semester} · PKR {s.totalAmount.toLocaleString()}</option>)}
                                </select></div>
                            <div><label className="text-xs font-semibold text-gray-600 mb-1 block">Due Date</label>
                                <input required type="date" value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })}
                                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-leads-blue" /></div>
                            {error && <p className="text-red-600 text-xs bg-red-50 rounded px-3 py-2">{error}</p>}
                            <div className="flex gap-3">
                                <button type="button" onClick={() => setShowModal(false)} className="flex-1 border border-gray-200 rounded-lg py-2 text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
                                <button type="submit" disabled={saving} className="flex-1 bg-leads-blue text-white rounded-lg py-2 text-sm font-medium hover:bg-blue-800 flex items-center justify-center gap-2">
                                    {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Create
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}

            {/* Payment Modal */}
            {showPayModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                    <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="font-bold text-leads-blue">Record Payment</h2>
                            <button onClick={() => setShowPayModal(null)}><X size={18} className="text-gray-400" /></button>
                        </div>
                        <p className="text-xs text-gray-500 mb-4">Invoice: <strong className="font-mono">{showPayModal.invoiceNumber}</strong> · {showPayModal.studentName}</p>
                        <form onSubmit={handlePayment} className="space-y-3">
                            <div><label className="text-xs font-semibold text-gray-600 mb-1 block">Amount (PKR)</label>
                                <input required type="number" step="0.01" value={payForm.amount} onChange={e => setPayForm({ ...payForm, amount: parseFloat(e.target.value) })}
                                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-leads-blue" /></div>
                            <div><label className="text-xs font-semibold text-gray-600 mb-1 block">Mode</label>
                                <select value={payForm.paymentMode} onChange={e => setPayForm({ ...payForm, paymentMode: e.target.value })}
                                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-leads-blue">
                                    {['CASH', 'BANK_TRANSFER', 'CHEQUE', 'ONLINE', 'DD'].map(m => <option key={m}>{m}</option>)}
                                </select></div>
                            <div><label className="text-xs font-semibold text-gray-600 mb-1 block">Payment Date</label>
                                <input required type="date" value={payForm.paymentDate} onChange={e => setPayForm({ ...payForm, paymentDate: e.target.value })}
                                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-leads-blue" /></div>
                            {error && <p className="text-red-600 text-xs bg-red-50 rounded px-3 py-2">{error}</p>}
                            <p className="text-[10px] text-gray-400">A journal entry (DR Cash / CR Student Receivable) will be automatically posted.</p>
                            <div className="flex gap-3">
                                <button type="button" onClick={() => setShowPayModal(null)} className="flex-1 border border-gray-200 rounded-lg py-2 text-sm text-gray-600">Cancel</button>
                                <button type="submit" disabled={saving} className="flex-1 bg-green-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-green-700 flex items-center justify-center gap-2">
                                    {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Post Payment
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}
        </div>
    );
}
