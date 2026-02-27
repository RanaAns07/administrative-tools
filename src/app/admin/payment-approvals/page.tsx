'use client';
/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, react/no-unescaped-entities */

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
    Check, X, Loader2, Clock, CheckCircle, XCircle, RefreshCw,
    BookOpen, CreditCard, ShoppingCart, FileText
} from 'lucide-react';
import Link from 'next/link';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Payment {
    _id: string; receiptNumber: string; amount: number; paymentMode: string;
    paymentDate: string; chequeNumber?: string; bankName?: string;
    transactionReference?: string; receivedBy: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED'; rejectionReason?: string;
    feeInvoice?: { invoiceNumber: string; studentName: string; rollNumber: string };
    createdAt: string;
}

interface JournalLine { accountCode: string; accountName: string; debit: number; credit: number; }
interface JE {
    _id: string; entryNumber: string; entryDate: string; description: string;
    source: string; status: string; totalDebit: number; totalCredit: number;
    lines: JournalLine[]; createdBy?: string;
}

interface PRItem { itemDescription: string; quantity: number; estimatedUnitCost: number; }
interface PR {
    _id: string; prNumber: string; title: string; requestedBy: string;
    department: string; status: string; totalEstimatedCost: number;
    items: PRItem[]; justification?: string; createdAt: string;
}

interface VendorInvoice {
    _id: string; internalReference: string; vendorInvoiceNumber: string;
    vendor: { companyName: string; vendorCode: string };
    invoiceDate: string; dueDate: string;
    subtotal: number; taxAmount: number; totalAmount: number;
    status: string; description?: string; createdAt: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const modeColors: Record<string, string> = {
    CASH: 'bg-green-100 text-green-700', BANK_TRANSFER: 'bg-blue-100 text-blue-700',
    CHEQUE: 'bg-yellow-100 text-yellow-700', ONLINE: 'bg-purple-100 text-purple-700', DD: 'bg-gray-100 text-gray-700',
};

function PortalHeader() {
    return (
        <header className="bg-white border-b border-gray-200 px-4 sm:px-8 py-4 flex items-center justify-between sticky top-0 z-10">
            <div>
                <h1 className="text-xl font-bold text-leads-blue">Approvals Centre</h1>
                <p className="text-xs text-gray-500 mt-0.5">Everything that needs your review and sign-off</p>
            </div>
            <div className="flex items-center gap-2">
                <Link href="/" className="flex items-center gap-2 text-leads-blue border border-leads-blue text-sm font-medium px-3 py-2 rounded-md hover:bg-leads-blue hover:text-white transition-all">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
                    </svg>
                    <span className="hidden sm:inline">Go to Portal</span>
                </Link>
                <Link href="/admin" className="text-sm text-gray-500 hover:text-leads-blue px-3 py-2 rounded-md hover:bg-gray-50">Admin</Link>
            </div>
        </header>
    );
}

function RejectModal({ show, title, onCancel, onConfirm, loading }: {
    show: boolean; title: string; onCancel: () => void; onConfirm: (r: string) => void; loading: boolean;
}) {
    const [reason, setReason] = useState('');
    if (!show) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
                <h2 className="font-bold text-leads-blue text-lg mb-1">Reject — {title}</h2>
                <p className="text-xs text-gray-500 mb-4">Provide a reason so the submitter can revise and resubmit.</p>
                <textarea rows={3} value={reason} onChange={e => setReason(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-red-400 mb-4"
                    placeholder="e.g., Insufficient justification. Please provide quotations." />
                <div className="flex gap-3">
                    <button onClick={onCancel} className="flex-1 border border-gray-200 rounded-lg py-2 text-sm">Cancel</button>
                    <button onClick={() => onConfirm(reason)} disabled={loading || !reason.trim()}
                        className="flex-1 bg-red-500 text-white rounded-lg py-2 text-sm font-medium hover:bg-red-600 flex items-center justify-center gap-2 disabled:opacity-50">
                        {loading ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />} Confirm Reject
                    </button>
                </div>
            </motion.div>
        </div>
    );
}

type Tab = 'je' | 'pr' | 'vi' | 'payments';

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function ApprovalsPage() {
    const [tab, setTab] = useState<Tab>('je');
    const [counts, setCounts] = useState<Record<Tab, number>>({ je: 0, pr: 0, vi: 0, payments: 0 });

    useEffect(() => {
        // Fetch pending counts for badge display
        Promise.all([
            fetch('/api/admin/je-approvals?status=PENDING_APPROVAL').then(r => r.json()),
            fetch('/api/finance/purchase-requests?status=PENDING_APPROVAL').then(r => r.json()),
            fetch('/api/finance/vendor-invoices?status=PENDING').then(r => r.json()),
            fetch('/api/admin/payment-approvals?status=PENDING').then(r => r.json()),
        ]).then(([je, pr, vi, pay]) => {
            setCounts({
                je: Array.isArray(je) ? je.length : 0,
                pr: Array.isArray(pr) ? pr.length : 0,
                vi: Array.isArray(vi) ? vi.length : 0,
                payments: Array.isArray(pay) ? pay.length : 0,
            });
        });
    }, []);

    const tabs: { id: Tab; label: string; Icon: any; color: string }[] = [
        { id: 'je', label: 'Journal Entries', Icon: BookOpen, color: 'text-blue-600' },
        { id: 'pr', label: 'Purchase Requests', Icon: ShoppingCart, color: 'text-orange-600' },
        { id: 'vi', label: 'Vendor Invoices', Icon: FileText, color: 'text-purple-600' },
        { id: 'payments', label: 'Fee Payments', Icon: CreditCard, color: 'text-yellow-600' },
    ];

    return (
        <div className="min-h-screen bg-gray-50">
            <PortalHeader />
            <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
                {/* Tab bar */}
                <div className="flex gap-1 bg-white border border-gray-200 rounded-xl p-1">
                    {tabs.map(({ id, label, Icon, color }) => (
                        <button key={id} onClick={() => setTab(id)}
                            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all relative ${tab === id ? 'bg-leads-blue text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50'}`}>
                            <Icon size={14} />
                            <span className="hidden sm:inline">{label}</span>
                            {counts[id] > 0 && (
                                <span className={`ml-0.5 inline-flex items-center justify-center min-w-[18px] h-[18px] text-[10px] font-bold rounded-full px-1 ${tab === id ? 'bg-white text-leads-blue' : 'bg-leads-red text-white'}`}>
                                    {counts[id]}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {tab === 'je' && <JESection onCountChange={c => setCounts(p => ({ ...p, je: c }))} />}
                {tab === 'pr' && <PRSection onCountChange={c => setCounts(p => ({ ...p, pr: c }))} />}
                {tab === 'vi' && <VISection onCountChange={c => setCounts(p => ({ ...p, vi: c }))} />}
                {tab === 'payments' && <PaymentsSection onCountChange={c => setCounts(p => ({ ...p, payments: c }))} />}
            </main>
        </div>
    );
}

// ─── JE Section ───────────────────────────────────────────────────────────────

function JESection({ onCountChange }: { onCountChange: (c: number) => void }) {
    const [entries, setEntries] = useState<JE[]>([]);
    const [statusFilter, setStatusFilter] = useState<'PENDING_APPROVAL' | 'POSTED' | 'REJECTED'>('PENDING_APPROVAL');
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [rejectTarget, setRejectTarget] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const fetch_ = (s = statusFilter) => {
        setLoading(true);
        fetch(`/api/admin/je-approvals?status=${s}`)
            .then(r => r.json()).then(d => {
                const list = Array.isArray(d) ? d : [];
                setEntries(list);
                if (s === 'PENDING_APPROVAL') onCountChange(list.length);
            })
            .catch(e => setError(e.message)).finally(() => setLoading(false));
    };
    useEffect(() => { fetch_(statusFilter); }, [statusFilter]);

    const approve = async (id: string) => {
        setActionLoading(id); setError(null);
        try {
            const res = await fetch('/api/admin/je-approvals', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ jeId: id, action: 'APPROVE' }) });
            if (!res.ok) throw new Error((await res.json()).error);
            fetch_();
        } catch (e: any) { setError(e.message); } finally { setActionLoading(null); }
    };

    const reject = async (reason: string) => {
        setActionLoading(rejectTarget!); setError(null);
        try {
            const res = await fetch('/api/admin/je-approvals', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ jeId: rejectTarget, action: 'REJECT', rejectionReason: reason }) });
            if (!res.ok) throw new Error((await res.json()).error);
            setRejectTarget(null); fetch_();
        } catch (e: any) { setError(e.message); } finally { setActionLoading(null); }
    };

    return (
        <div className="space-y-4">
            {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3 flex gap-2">{error}<button className="ml-auto" onClick={() => setError(null)}><X size={14} /></button></div>}
            <StatusTabs value={statusFilter} onChange={s => setStatusFilter(s as any)} options={['PENDING_APPROVAL', 'POSTED', 'REJECTED']} labels={{ PENDING_APPROVAL: 'Pending', POSTED: 'Posted', REJECTED: 'Rejected' }} onRefresh={() => fetch_(statusFilter)} />
            {statusFilter === 'PENDING_APPROVAL' && <InfoBanner icon={<BookOpen size={15} />} color="blue" title="Journal entries awaiting Finance Manager approval" sub="Approving a JE will POST it to the General Ledger permanently. Check the debit/credit lines before posting." />}
            <ItemList loading={loading} empty={entries.length === 0} emptyText={statusFilter === 'PENDING_APPROVAL' ? 'No pending journal entries.' : `No ${statusFilter.toLowerCase()} entries.`}>
                {entries.map((je, i) => (
                    <motion.div key={je._id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }} className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-sm">
                        <button onClick={() => setExpandedId(expandedId === je._id ? null : je._id)} className="w-full flex items-center justify-between p-5 text-left">
                            <div className="flex-1 space-y-0.5">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-mono text-xs font-bold text-leads-blue">{je.entryNumber}</span>
                                    <StatusBadge status={je.status} map={{ PENDING_APPROVAL: ['yellow', 'PENDING'], POSTED: ['green', 'POSTED'], REJECTED: ['red', 'REJECTED'] }} />
                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-bold">{je.source}</span>
                                </div>
                                <p className="text-sm font-semibold text-gray-800">{je.description}</p>
                                <p className="text-xs text-gray-400">{new Date(je.entryDate).toLocaleDateString('en-PK')} {je.createdBy && `· ${je.createdBy}`}</p>
                            </div>
                            <div className="flex items-center gap-4 shrink-0">
                                <div className="text-right"><p className="text-sm font-bold text-leads-blue">DR {je.totalDebit?.toLocaleString('en-PK')}</p><p className="text-xs text-gray-400">CR {je.totalCredit?.toLocaleString('en-PK')}</p></div>
                                {statusFilter === 'PENDING_APPROVAL' && <ApproveRejectBtns id={je._id} loading={actionLoading} onApprove={approve} onReject={id => setRejectTarget(id)} />}
                            </div>
                        </button>
                        {expandedId === je._id && je.lines?.length > 0 && (
                            <div className="border-t border-gray-100 px-5 pb-4">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider my-2">Journal Lines</p>
                                <table className="w-full text-xs"><thead className="bg-gray-50 border-b border-gray-100"><tr><th className="text-left px-3 py-1.5 font-semibold text-gray-500">Account</th><th className="text-right px-3 py-1.5 font-semibold text-gray-500">Debit</th><th className="text-right px-3 py-1.5 font-semibold text-gray-500">Credit</th></tr></thead>
                                    <tbody className="divide-y divide-gray-50">{je.lines.map((l, li) => (<tr key={li}><td className="px-3 py-1.5 text-gray-700"><span className="font-mono text-leads-blue mr-1">{l.accountCode}</span>{l.accountName}</td><td className="px-3 py-1.5 text-right font-mono">{l.debit > 0 ? l.debit.toLocaleString('en-PK') : '—'}</td><td className="px-3 py-1.5 text-right font-mono">{l.credit > 0 ? l.credit.toLocaleString('en-PK') : '—'}</td></tr>))}</tbody>
                                </table>
                            </div>
                        )}
                    </motion.div>
                ))}
            </ItemList>
            <RejectModal show={!!rejectTarget} title="Journal Entry" onCancel={() => setRejectTarget(null)} onConfirm={reject} loading={!!actionLoading} />
        </div>
    );
}

// ─── PR Section ───────────────────────────────────────────────────────────────

function PRSection({ onCountChange }: { onCountChange: (c: number) => void }) {
    const [prs, setPRs] = useState<PR[]>([]);
    const [statusFilter, setStatusFilter] = useState('PENDING_APPROVAL');
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [rejectTarget, setRejectTarget] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const fetch_ = (s = statusFilter) => {
        setLoading(true);
        fetch(`/api/finance/purchase-requests?status=${s}`)
            .then(r => r.json()).then(d => {
                const list = Array.isArray(d) ? d : (d.prs || []);
                setPRs(list);
                if (s === 'PENDING_APPROVAL') onCountChange(list.length);
            })
            .catch(e => setError(e.message)).finally(() => setLoading(false));
    };
    useEffect(() => { fetch_(statusFilter); }, [statusFilter]);

    const action = async (id: string, act: string, reason?: string) => {
        setActionLoading(id); setError(null);
        try {
            const res = await fetch(`/api/finance/purchase-requests/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: act, rejectionReason: reason }) });
            if (!res.ok) throw new Error((await res.json()).error);
            setRejectTarget(null); fetch_();
        } catch (e: any) { setError(e.message); } finally { setActionLoading(null); }
    };

    return (
        <div className="space-y-4">
            {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3 flex gap-2">{error}<button className="ml-auto" onClick={() => setError(null)}><X size={14} /></button></div>}
            <StatusTabs value={statusFilter} onChange={setStatusFilter} options={['PENDING_APPROVAL', 'APPROVED', 'REJECTED']} labels={{ PENDING_APPROVAL: 'Pending', APPROVED: 'Approved', REJECTED: 'Rejected' }} onRefresh={() => fetch_(statusFilter)} />
            {statusFilter === 'PENDING_APPROVAL' && <InfoBanner icon={<ShoppingCart size={15} />} color="orange" title="Purchase requests awaiting approval" sub="Approved PRs can be converted into Purchase Orders. Review the items and estimated cost before approving." />}
            <ItemList loading={loading} empty={prs.length === 0} emptyText={statusFilter === 'PENDING_APPROVAL' ? 'No pending purchase requests.' : `No ${statusFilter.toLowerCase()} purchase requests.`}>
                {prs.map((pr, i) => (
                    <motion.div key={pr._id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }} className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-sm">
                        <button onClick={() => setExpandedId(expandedId === pr._id ? null : pr._id)} className="w-full flex items-center justify-between p-5 text-left">
                            <div className="flex-1 space-y-0.5">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-mono text-xs font-bold text-leads-blue">{pr.prNumber}</span>
                                    <StatusBadge status={pr.status} map={{ PENDING_APPROVAL: ['yellow', 'PENDING'], APPROVED: ['green', 'APPROVED'], REJECTED: ['red', 'REJECTED'] }} />
                                </div>
                                <p className="text-sm font-semibold text-gray-800">{pr.title}</p>
                                <p className="text-xs text-gray-400">{pr.department} · By: {pr.requestedBy} · {new Date(pr.createdAt).toLocaleDateString('en-PK')}</p>
                            </div>
                            <div className="flex items-center gap-4 shrink-0">
                                <p className="text-sm font-bold text-leads-blue">PKR {pr.totalEstimatedCost?.toLocaleString('en-PK')}</p>
                                {statusFilter === 'PENDING_APPROVAL' && <ApproveRejectBtns id={pr._id} loading={actionLoading} onApprove={id => action(id, 'APPROVE')} onReject={id => setRejectTarget(id)} />}
                            </div>
                        </button>
                        {expandedId === pr._id && (
                            <div className="border-t border-gray-100 px-5 pb-4 space-y-2">
                                {pr.justification && <p className="text-xs text-gray-500 italic">"{pr.justification}"</p>}
                                <table className="w-full text-xs"><thead className="bg-gray-50 border-b border-gray-100"><tr><th className="text-left px-3 py-1.5 font-semibold text-gray-500">Item</th><th className="text-right px-3 py-1.5 font-semibold text-gray-500">Qty</th><th className="text-right px-3 py-1.5 font-semibold text-gray-500">Unit Cost</th><th className="text-right px-3 py-1.5 font-semibold text-gray-500">Total</th></tr></thead>
                                    <tbody className="divide-y divide-gray-50">{pr.items.map((item, ii) => (<tr key={ii}><td className="px-3 py-1.5 text-gray-700">{item.itemDescription}</td><td className="px-3 py-1.5 text-right">{item.quantity}</td><td className="px-3 py-1.5 text-right font-mono">{item.estimatedUnitCost?.toLocaleString('en-PK')}</td><td className="px-3 py-1.5 text-right font-mono font-semibold">{(item.quantity * item.estimatedUnitCost).toLocaleString('en-PK')}</td></tr>))}</tbody>
                                </table>
                            </div>
                        )}
                    </motion.div>
                ))}
            </ItemList>
            <RejectModal show={!!rejectTarget} title="Purchase Request" onCancel={() => setRejectTarget(null)} onConfirm={r => action(rejectTarget!, 'REJECT', r)} loading={!!actionLoading} />
        </div>
    );
}

// ─── Vendor Invoice Section ───────────────────────────────────────────────────

function VISection({ onCountChange }: { onCountChange: (c: number) => void }) {
    const [invoices, setInvoices] = useState<VendorInvoice[]>([]);
    const [statusFilter, setStatusFilter] = useState('PENDING');
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [rejectTarget, setRejectTarget] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const fetch_ = (s = statusFilter) => {
        setLoading(true);
        fetch(`/api/finance/vendor-invoices?status=${s}`)
            .then(r => r.json()).then(d => {
                const list = Array.isArray(d) ? d : [];
                setInvoices(list);
                if (s === 'PENDING') onCountChange(list.length);
            })
            .catch(e => setError(e.message)).finally(() => setLoading(false));
    };
    useEffect(() => { fetch_(statusFilter); }, [statusFilter]);

    const action = async (id: string, act: 'APPROVE' | 'REJECT', reason?: string) => {
        setActionLoading(id); setError(null);
        try {
            const res = await fetch(`/api/finance/vendor-invoices/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: act, rejectionReason: reason }) });
            if (!res.ok) throw new Error((await res.json()).error);
            setRejectTarget(null); fetch_();
        } catch (e: any) { setError(e.message); } finally { setActionLoading(null); }
    };

    return (
        <div className="space-y-4">
            {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3 flex gap-2">{error}<button className="ml-auto" onClick={() => setError(null)}><X size={14} /></button></div>}
            <StatusTabs value={statusFilter} onChange={setStatusFilter} options={['PENDING', 'APPROVED', 'DISPUTED']} labels={{ PENDING: 'Pending', APPROVED: 'Approved', DISPUTED: 'Disputed' }} onRefresh={() => fetch_(statusFilter)} />
            {statusFilter === 'PENDING' && <InfoBanner icon={<FileText size={15} />} color="purple" title="Vendor invoices awaiting approval" sub="Approving a vendor invoice confirms we owe this amount to the vendor. The AP journal entry was already posted when the invoice was recorded." />}
            <ItemList loading={loading} empty={invoices.length === 0} emptyText={statusFilter === 'PENDING' ? 'No pending vendor invoices.' : `No ${statusFilter.toLowerCase()} invoices.`}>
                {invoices.map((inv, i) => (
                    <motion.div key={inv._id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }} className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col sm:flex-row sm:items-center gap-4 hover:shadow-sm">
                        <div className="flex-1 space-y-0.5">
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-mono text-xs font-bold text-leads-blue">{inv.internalReference}</span>
                                <span className="font-mono text-xs text-gray-400">{inv.vendorInvoiceNumber}</span>
                                <StatusBadge status={inv.status} map={{ PENDING: ['yellow', 'PENDING'], APPROVED: ['green', 'APPROVED'], DISPUTED: ['red', 'DISPUTED'] }} />
                            </div>
                            <p className="text-sm font-semibold text-gray-800">{inv.vendor?.companyName}</p>
                            {inv.description && <p className="text-xs text-gray-500 italic">"{inv.description}"</p>}
                            <p className="text-xs text-gray-400">Invoice: {new Date(inv.invoiceDate).toLocaleDateString('en-PK')} · Due: {new Date(inv.dueDate).toLocaleDateString('en-PK')}</p>
                        </div>
                        <div className="flex items-center gap-4 shrink-0">
                            <div className="text-right">
                                <p className="text-sm font-bold text-leads-blue">PKR {inv.totalAmount?.toLocaleString('en-PK')}</p>
                                <p className="text-xs text-gray-400">GST: {inv.taxAmount?.toLocaleString('en-PK')}</p>
                            </div>
                            {statusFilter === 'PENDING' && <ApproveRejectBtns id={inv._id} loading={actionLoading} onApprove={id => action(id, 'APPROVE')} onReject={id => setRejectTarget(id)} />}
                        </div>
                    </motion.div>
                ))}
            </ItemList>
            <RejectModal show={!!rejectTarget} title="Vendor Invoice" onCancel={() => setRejectTarget(null)} onConfirm={r => action(rejectTarget!, 'REJECT', r)} loading={!!actionLoading} />
        </div>
    );
}

// ─── Fee Payments Section ────────────────────────────────────────────────────

function PaymentsSection({ onCountChange }: { onCountChange: (c: number) => void }) {
    const [payments, setPayments] = useState<Payment[]>([]);
    const [filterStatus, setFilterStatus] = useState<'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING');
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [rejectTarget, setRejectTarget] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const fetch_ = (s = filterStatus) => {
        setLoading(true);
        fetch(`/api/admin/payment-approvals?status=${s}`)
            .then(r => r.json()).then(d => {
                const list = Array.isArray(d) ? d : [];
                setPayments(list);
                if (s === 'PENDING') onCountChange(list.length);
            })
            .catch(e => setError(e.message)).finally(() => setLoading(false));
    };
    useEffect(() => { fetch_(filterStatus); }, [filterStatus]);

    const action = async (id: string, act: string, reason?: string) => {
        setActionLoading(id); setError(null);
        try {
            const res = await fetch('/api/admin/payment-approvals', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ paymentId: id, action: act, rejectionReason: reason }) });
            if (!res.ok) throw new Error((await res.json()).error);
            setRejectTarget(null); fetch_();
        } catch (e: any) { setError(e.message); } finally { setActionLoading(null); }
    };

    return (
        <div className="space-y-4">
            {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3 flex gap-2">{error}<button className="ml-auto" onClick={() => setError(null)}><X size={14} /></button></div>}
            <StatusTabs value={filterStatus} onChange={s => setFilterStatus(s as any)} options={['PENDING', 'APPROVED', 'REJECTED']} labels={{ PENDING: 'Pending', APPROVED: 'Approved', REJECTED: 'Rejected' }} onRefresh={() => fetch_(filterStatus)} />
            {filterStatus === 'PENDING' && <InfoBanner icon={<CreditCard size={15} />} color="yellow" title="Cheque & Bank Transfer payments need clearance" sub="Approving a payment will update the student's invoice balance. Rejecting leaves the invoice unchanged." />}
            <ItemList loading={loading} empty={payments.length === 0} emptyText={filterStatus === 'PENDING' ? 'No pending payments — all clear!' : `No ${filterStatus.toLowerCase()} payments.`}>
                {payments.map((p, i) => (
                    <motion.div key={p._id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }} className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col sm:flex-row sm:items-center gap-4 hover:shadow-sm">
                        <div className="flex-1 space-y-0.5">
                            <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-mono text-xs font-bold text-leads-blue">{p.receiptNumber}</p>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${modeColors[p.paymentMode] || 'bg-gray-100'}`}>{p.paymentMode.replace(/_/g, ' ')}</span>
                            </div>
                            {p.feeInvoice && <p className="text-sm font-semibold text-gray-800">{p.feeInvoice.studentName} <span className="text-xs text-gray-400 font-normal">· {p.feeInvoice.rollNumber}</span></p>}
                            <p className="text-xs text-gray-400">By: {p.receivedBy} · {new Date(p.paymentDate).toLocaleDateString('en-PK')} {p.chequeNumber && `· Cheque #${p.chequeNumber}`} {p.bankName && `· ${p.bankName}`}</p>
                            {p.rejectionReason && <p className="text-xs text-red-500">Reason: {p.rejectionReason}</p>}
                        </div>
                        <div className="flex items-center gap-4 shrink-0">
                            <p className="text-sm font-bold text-leads-blue">PKR {p.amount.toLocaleString('en-PK')}</p>
                            {filterStatus === 'PENDING' && <ApproveRejectBtns id={p._id} loading={actionLoading} onApprove={id => action(id, 'APPROVE')} onReject={id => setRejectTarget(id)} />}
                        </div>
                    </motion.div>
                ))}
            </ItemList>
            <RejectModal show={!!rejectTarget} title="Payment" onCancel={() => setRejectTarget(null)} onConfirm={r => action(rejectTarget!, 'REJECT', r)} loading={!!actionLoading} />
        </div>
    );
}

// ─── Shared sub-components ───────────────────────────────────────────────────

function StatusTabs({ value, onChange, options, labels, onRefresh }: { value: string; onChange: (s: string) => void; options: string[]; labels: Record<string, string>; onRefresh: () => void }) {
    return (
        <div className="flex gap-2 items-center">
            {options.map(s => (
                <button key={s} onClick={() => onChange(s)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${value === s ? 'bg-leads-blue text-white shadow-sm' : 'bg-white border border-gray-200 text-gray-600 hover:border-leads-blue'}`}>
                    {s.includes('PENDING') ? <Clock size={12} /> : s.includes('APPROVE') || s.includes('POST') ? <CheckCircle size={12} /> : <XCircle size={12} />}
                    {labels[s] || s}
                </button>
            ))}
            <button onClick={onRefresh} className="ml-auto p-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-500"><RefreshCw size={15} /></button>
        </div>
    );
}

function InfoBanner({ icon, color, title, sub }: { icon: React.ReactNode; color: string; title: string; sub: string }) {
    const cls: Record<string, string> = { blue: 'bg-blue-50 border-blue-200 text-blue-800', orange: 'bg-orange-50 border-orange-200 text-orange-800', purple: 'bg-purple-50 border-purple-200 text-purple-800', yellow: 'bg-yellow-50 border-yellow-200 text-yellow-800' };
    const sub_cls: Record<string, string> = { blue: 'text-blue-600', orange: 'text-orange-600', purple: 'text-purple-600', yellow: 'text-yellow-700' };
    return (
        <div className={`border rounded-lg px-4 py-3 flex items-start gap-2 text-sm ${cls[color]}`}>
            <span className="mt-0.5 flex-shrink-0">{icon}</span>
            <div><p className="font-semibold">{title}</p><p className={`text-xs mt-0.5 ${sub_cls[color]}`}>{sub}</p></div>
        </div>
    );
}

function ItemList({ loading, empty, emptyText, children }: { loading: boolean; empty: boolean; emptyText: string; children: React.ReactNode }) {
    if (loading) return <div className="py-16 text-center"><Loader2 className="animate-spin mx-auto text-gray-400" size={26} /></div>;
    if (empty) return (
        <div className="bg-white rounded-xl border border-gray-200 py-16 text-center">
            <CheckCircle size={40} className="mx-auto text-green-400 mb-3 opacity-60" />
            <p className="text-gray-500 text-sm font-medium">{emptyText}</p>
        </div>
    );
    return <div className="space-y-3">{children}</div>;
}

function ApproveRejectBtns({ id, loading, onApprove, onReject }: { id: string; loading: string | null; onApprove: (id: string) => void; onReject: (id: string) => void }) {
    return (
        <div className="flex gap-2">
            <button onClick={e => { e.stopPropagation(); onApprove(id); }} disabled={!!loading}
                className="flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold px-3 py-2 rounded-lg disabled:opacity-50 transition-colors">
                {loading === id ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} Approve
            </button>
            <button onClick={e => { e.stopPropagation(); onReject(id); }} disabled={!!loading}
                className="flex items-center gap-1 bg-red-500 hover:bg-red-600 text-white text-xs font-semibold px-3 py-2 rounded-lg disabled:opacity-50 transition-colors">
                <X size={13} /> Reject
            </button>
        </div>
    );
}

function StatusBadge({ status, map }: { status: string; map: Record<string, [string, string]> }) {
    const colors: Record<string, string> = { yellow: 'bg-yellow-100 text-yellow-700', green: 'bg-green-100 text-green-700', red: 'bg-red-100 text-red-700', blue: 'bg-blue-100 text-blue-700' };
    const entry = map[status];
    if (!entry) return null;
    return <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${colors[entry[0]]}`}>{entry[1]}</span>;
}
