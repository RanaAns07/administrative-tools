'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Users, Plus, Loader2, X, Check, IndianRupee, Clock, AlertTriangle } from 'lucide-react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import Pagination from '../../_components/Pagination';
import RoleGuard from '../../_components/RoleGuard';

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

export default function FeeInvoicesClient() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const page = parseInt(searchParams.get('page') || '1');
    const statusParam = searchParams.get('status') || '';

    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [totalCount, setTotalCount] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [showPayModal, setShowPayModal] = useState<Invoice | null>(null);
    const [structures, setStructures] = useState<FeeStructure[]>([]);
    const [wallets, setWallets] = useState<any[]>([]);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Checkbox state for overpayment confirmation
    const [confirmOverpayment, setConfirmOverpayment] = useState(false);

    const [form, setForm] = useState({ studentId: '', studentName: '', rollNumber: '', feeStructureId: '', dueDate: '' });
    const [payForm, setPayForm] = useState({ amount: 0, paymentMode: 'CASH', paymentDate: new Date().toISOString().split('T')[0], walletId: '' });

    const fetchInvoices = (status = '', pageNum = 1) => {
        setLoading(true);
        const qs = new URLSearchParams();
        if (status) qs.set('status', status);
        qs.set('page', pageNum.toString());
        qs.set('limit', '50');

        fetch(`/api/finance/fee-invoices?${qs.toString()}`)
            .then(r => r.json()).then(d => {
                const mapped = (d.invoices || []).map((raw: any) => {
                    const payable = raw.totalAmount - (raw.discountAmount || 0) - (raw.discountFromAdvance || 0) + (raw.penaltyAmount || 0);
                    const arrears = Math.max(0, payable - (raw.amountPaid || 0));

                    return {
                        _id: raw._id,
                        invoiceNumber: raw._id.substring(raw._id.length - 6).toUpperCase(),
                        studentName: raw.studentProfileId?.name || 'Unknown',
                        rollNumber: raw.studentProfileId?.registrationNumber || 'N/A',
                        program: raw.feeStructureId?.batchId?.programId?.name || 'Unknown',
                        semester: raw.semesterNumber?.toString() || '',
                        totalAmount: raw.totalAmount,
                        paidAmount: raw.amountPaid || 0,
                        outstandingAmount: arrears,
                        dueDate: raw.dueDate,
                        status: raw.status
                    };
                });
                setInvoices(mapped);
                setTotalCount(d.total || 0);
                setTotalPages(Math.ceil((d.total || 0) / 50));
            })
            .catch(e => setError(e.message)).finally(() => setLoading(false));
    };

    useEffect(() => { fetchInvoices(statusParam, page); }, [statusParam, page]);
    useEffect(() => {
        fetch('/api/finance/fee-structures').then(r => r.json()).then(setStructures);
        fetch('/api/finance/wallets').then(r => r.json()).then(w => {
            setWallets(w);
            if (w?.length > 0) setPayForm(prev => ({ ...prev, walletId: w[0]._id }));
        });
    }, []);

    const setFilterStatus = (s: string) => {
        const params = new URLSearchParams(searchParams.toString());
        if (s) params.set('status', s);
        else params.delete('status');
        params.set('page', '1');
        router.push(`${pathname}?${params.toString()}`);
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault(); setSaving(true); setError(null);
        try {
            const res = await fetch('/api/finance/fee-invoices', {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
                    studentProfileId: form.studentId, // Map state to API expectation
                    feeStructureId: form.feeStructureId,
                    dueDate: form.dueDate
                }),
            });

            const textResponse = await res.text();
            let data;
            try {
                data = JSON.parse(textResponse);
            } catch (e) {
                console.error("Non-JSON Response Payload:", textResponse);
                throw new Error("Server returned an invalid or HTML response. Check server logs for a crash trace.");
            }

            if (!res.ok) throw new Error(data.error || "Failed to create invoice");

            setShowModal(false); fetchInvoices(statusParam, page);
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
                body: JSON.stringify({
                    invoiceId: showPayModal._id,
                    amount: payForm.amount,
                    walletId: payForm.walletId,
                    paymentMethod: payForm.paymentMode,
                    date: payForm.paymentDate
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setShowPayModal(null); setConfirmOverpayment(false); fetchInvoices(statusParam, page);
        } catch (err: any) { setError(err.message); }
        finally { setSaving(false); }
    };

    // Derived state for overpayment warning
    const isOverpaying = showPayModal ? payForm.amount > showPayModal.outstandingAmount : false;
    const overpaymentAmount = isOverpaying && showPayModal ? payForm.amount - showPayModal.outstandingAmount : 0;
    const canSubmitPayment = saving ? false : (isOverpaying ? confirmOverpayment : payForm.amount > 0);

    return (
        <div className="space-y-5 flex flex-col min-h-full">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h1 className="text-xl font-bold text-leads-blue flex items-center gap-2"><Users size={22} /> Fee Invoices</h1>
                    <p className="text-xs text-gray-500 mt-0.5">Student fee billing · {totalCount} total invoices</p>
                </div>
                <RoleGuard>
                    <button onClick={() => setShowModal(true)}
                        className="flex items-center gap-2 bg-leads-blue text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-800 shadow-sm">
                        <Plus size={16} /> New Invoice
                    </button>
                </RoleGuard>
            </div>

            {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm flex gap-2">{error}<button className="ml-auto" onClick={() => setError(null)}><X size={12} /></button></div>}

            <div className="flex flex-wrap gap-2">
                {['', 'UNPAID', 'PARTIAL', 'PAID', 'OVERDUE'].map(s => (
                    <button key={s} onClick={() => setFilterStatus(s)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${statusParam === s ? 'bg-leads-blue text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                        {s || 'All'}
                    </button>
                ))}
            </div>

            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden border-b-0">
                <div className="overflow-x-auto border-b border-gray-200">
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
                                            <RoleGuard>
                                                <button onClick={() => { setShowPayModal(inv); setPayForm(prev => ({ ...prev, amount: inv.outstandingAmount, paymentMode: 'CASH', paymentDate: new Date().toISOString().split('T')[0] })); setConfirmOverpayment(false); }}
                                                    className="inline-flex text-xs bg-green-50 text-green-700 px-2.5 py-1 rounded-lg hover:bg-green-100 transition-colors items-center gap-1">
                                                    <IndianRupee size={11} /> Pay
                                                </button>
                                            </RoleGuard>
                                        )}
                                    </td>
                                </motion.tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            <Pagination currentPage={page} totalPages={totalPages} totalCount={totalCount} />

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
                            <div className="relative">
                                <label className="text-xs font-semibold text-gray-600 mb-1 block">Search Student *</label>
                                <input
                                    type="text"
                                    placeholder="Search by name or registration number..."
                                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-leads-blue"
                                    value={form.studentName}
                                    onChange={async (e) => {
                                        const query = e.target.value;
                                        setForm({ ...form, studentName: query, studentId: '' }); // Reset studentId on typing
                                        if (query.length > 2) {
                                            try {
                                                const res = await fetch(`/api/finance/university/students?search=${encodeURIComponent(query)}`);
                                                if (res.ok) {
                                                    const data = await res.json();
                                                    // Quick hack to show options: attaching fetched data to a temporary state variable
                                                    // Better to create a dedicated SearchableCombobox component, but this works inline
                                                    (window as any).__studentSearchResults = data;
                                                    // Trigger re-render to show options (handled below conceptually)
                                                }
                                            } catch (err) { }
                                        } else {
                                            (window as any).__studentSearchResults = [];
                                        }
                                    }}
                                />
                                {(window as any).__studentSearchResults?.length > 0 && !form.studentId && (
                                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                        {(window as any).__studentSearchResults.map((s: any) => (
                                            <div
                                                key={s._id}
                                                className="px-3 py-2 text-sm hover:bg-gray-50 cursor-pointer border-b border-gray-50 last:border-0"
                                                onClick={() => {
                                                    setForm({ ...form, studentId: s._id, studentName: s.name, rollNumber: s.registrationNumber || '' });
                                                    (window as any).__studentSearchResults = [];
                                                }}
                                            >
                                                <div className="font-medium text-gray-900">{s.name}</div>
                                                <div className="text-xs text-gray-500 font-mono">{s.registrationNumber}</div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {form.studentId && (
                                <div className="bg-blue-50/50 border border-blue-100 rounded-lg p-3 text-sm">
                                    <p className="text-xs text-gray-500 mb-0.5">Selected Student</p>
                                    <p className="font-semibold text-gray-900">{form.studentName}</p>
                                    <p className="text-xs text-leads-blue font-mono mt-0.5">{form.rollNumber}</p>
                                    <button type="button" onClick={() => setForm({ ...form, studentId: '', studentName: '', rollNumber: '' })} className="text-xs text-red-500 hover:text-red-700 mt-2 font-medium">Clear Selection</button>
                                </div>
                            )}

                            <div><label className="text-xs font-semibold text-gray-600 mb-1 block">Fee Structure *</label>
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

                        <form onSubmit={handlePayment} className="space-y-4">
                            <div><label className="text-xs font-semibold text-gray-600 mb-1 block">Amount (PKR)</label>
                                <input required type="number" step="0.01" min="1" value={payForm.amount || ''} onChange={e => setPayForm({ ...payForm, amount: parseFloat(e.target.value) || 0 })}
                                    className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 ${isOverpaying ? 'border-amber-300 focus:ring-amber-500 bg-amber-50' : 'border-gray-200 focus:ring-leads-blue'}`} />
                            </div>

                            {/* OVERPAYMENT WARNING UI */}
                            {isOverpaying && (
                                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                                    <div className="flex gap-2 items-start text-amber-800">
                                        <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
                                        <div className="text-xs">
                                            <p className="font-bold mb-1">Overpayment Detected</p>
                                            <p>The entered amount exceeds the outstanding balance by <strong>PKR {overpaymentAmount.toLocaleString()}</strong>.</p>
                                            <p className="mt-1">The excess amount will be added to the student's <strong>Advance Balance</strong>.</p>
                                        </div>
                                    </div>
                                    <label className="flex items-center gap-2 mt-3 text-xs text-amber-900 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={confirmOverpayment}
                                            onChange={(e) => setConfirmOverpayment(e.target.checked)}
                                            className="rounded border-amber-300 text-amber-600 focus:ring-amber-500"
                                        />
                                        I confirm processing this overpayment.
                                    </label>
                                </div>
                            )}

                            <div><label className="text-xs font-semibold text-gray-600 mb-1 block">Mode</label>
                                <select value={payForm.paymentMode} onChange={e => setPayForm({ ...payForm, paymentMode: e.target.value })}
                                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-leads-blue">
                                    {['CASH', 'BANK_TRANSFER', 'CHEQUE', 'ONLINE', 'DD'].map(m => <option key={m}>{m}</option>)}
                                </select></div>

                            <div><label className="text-xs font-semibold text-gray-600 mb-1 block">Deposit To Wallet *</label>
                                <select required value={payForm.walletId} onChange={e => setPayForm({ ...payForm, walletId: e.target.value })}
                                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-leads-blue">
                                    <option value="">-- Select Wallet --</option>
                                    {wallets.map(w => <option key={w._id} value={w._id}>{w.name} (PKR {(w.currentBalance || 0).toLocaleString()})</option>)}
                                </select></div>

                            <div><label className="text-xs font-semibold text-gray-600 mb-1 block">Payment Date</label>
                                <input required type="date" value={payForm.paymentDate} onChange={e => setPayForm({ ...payForm, paymentDate: e.target.value })}
                                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-leads-blue" /></div>

                            {error && <p className="text-red-600 text-xs bg-red-50 rounded px-3 py-2">{error}</p>}

                            {/* JARGON REMOVED: Plain Language applied */}
                            <p className="text-[10px] text-gray-400">This payment will be applied to the student's balance and tracked automatically.</p>

                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setShowPayModal(null)} className="flex-1 border border-gray-200 rounded-lg py-2 text-sm text-gray-600">Cancel</button>
                                <button type="submit" disabled={!canSubmitPayment} className={`flex-1 text-white rounded-lg py-2 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${canSubmitPayment ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-300 cursor-not-allowed'}`}>
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
