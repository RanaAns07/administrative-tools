'use client';

import React, { useEffect, useState, useMemo, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, Plus, Loader2, X, Check, IndianRupee, Clock, 
  AlertTriangle, Settings, LayoutList, CheckCircle, 
  ChevronRight, MoreVertical, CreditCard, Filter, 
  Download, Calendar, ArrowRight
} from 'lucide-react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';

import Pagination from '../../_components/Pagination';
import RoleGuard from '../../_components/RoleGuard';
import FeeOverrideModal from '@/components/finance/FeeOverrideModal';
import InstallmentWizard from '@/components/finance/InstallmentWizard';
import { IFeeInvoice } from '@/models/finance/FeeInvoice';

/**
 * FeeInvoicesClient Component
 * 
 * Optimized for university accountants to handle high-volume fee processing.
 * Features a dual-tab layout to separate standard submissions from active installment plans.
 * Implements "Quick Verify" buttons that rely on the backend cascading payment engine.
 */

interface Invoice {
    _id: string;
    invoiceNumber: string;
    studentName: string;
    rollNumber: string;
    program: string;
    semester: string;
    totalAmount: number;
    paidAmount: number;
    outstandingAmount: number;
    dueDate: string;
    status: 'PENDING' | 'PARTIAL' | 'PAID' | 'OVERDUE' | 'WAIVED';
    studentProfileId?: string;
}

const statusColors: Record<string, string> = {
    PENDING: 'bg-gray-100 text-gray-700',
    PARTIAL: 'bg-amber-100 text-amber-700',
    PAID: 'bg-emerald-100 text-emerald-700',
    OVERDUE: 'bg-red-100 text-red-700',
    WAIVED: 'bg-purple-100 text-purple-700',
};

function FeeInvoicesClientContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const page = parseInt(searchParams.get('page') || '1');
    
    // UI State
    const [activeTab, setActiveTab] = useState<'STANDARD' | 'INSTALLMENTS'>('STANDARD');
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [totalCount, setTotalCount] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState<string | null>(null); // Stores the ID of the invoice being processed
    const [error, setError] = useState<string | null>(null);
    
    // Modal State
    const [showModal, setShowModal] = useState(false); // New Invoice
    const [showOverrideModal, setShowOverrideModal] = useState<Invoice | null>(null);
    const [showInstallmentWizard, setShowInstallmentWizard] = useState<Invoice | null>(null);
    const [wallets, setWallets] = useState<any[]>([]);
    const [selectedActionRow, setSelectedActionRow] = useState<string | null>(null);

    const fetchInvoices = async () => {
        setLoading(true);
        try {
            // We fetch PARTIAL and PENDING for both views and filter locally or via query
            const res = await fetch(`/api/finance/fee-invoices?page=${page}&limit=50`);
            const data = await res.json();
            if (res.ok) {
                setInvoices(data.invoices);
                setTotalCount(data.total);
                setTotalPages(data.totalPages || 1);
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const fetchWallets = async () => {
        try {
            const res = await fetch('/api/finance/wallets');
            if (res.ok) {
                const data = await res.json();
                setWallets(data.filter((w: any) => w.isActive));
            }
        } catch (err) { }
    };

    useEffect(() => {
        fetchInvoices();
        fetchWallets();
    }, [page]);

    /**
     * Quick Verify Function
     * Automatically posts the required amount to the backend.
     * The backend handles the cascading logic (penalties -> installments -> principal).
     */
    const handleQuickVerify = async (inv: Invoice, amount: number) => {
        if (wallets.length === 0) {
            setError("No active wallet found to receive payment.");
            return;
        }

        setSaving(inv._id);
        setError(null);

        try {
            const res = await fetch('/api/finance/fee-payments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    invoiceId: inv._id,
                    amount: amount,
                    walletId: wallets[0]._id, // Uses the primary collection wallet
                    paymentMethod: 'CASH',
                    date: new Date().toISOString(),
                    notes: `Quick verified via Accountant Dashboard (${activeTab} view)`
                }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Payment verification failed");

            // Refresh data to reflect updated balances and status
            await fetchInvoices();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSaving(null);
        }
    };

    // Filtered data based on Tab
    const filteredInvoices = useMemo(() => {
        if (activeTab === 'STANDARD') {
            return invoices.filter(inv => inv.status === 'PENDING' || inv.status === 'PAID' || inv.status === 'OVERDUE');
        } else {
            // Installments view shows PARTIAL (Active Plans) or anyone with an installment hint
            return invoices.filter(inv => inv.status === 'PARTIAL');
        }
    }, [invoices, activeTab]);

    return (
        <div className="space-y-6 min-h-screen bg-gray-50/30 p-4 sm:p-6 lg:p-8">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                        <CreditCard className="w-8 h-8 text-blue-600" />
                        Fee Ledger
                    </h1>
                    <p className="text-sm text-slate-500 font-medium">Manage university collections and installment schedules.</p>
                </div>
                
                <div className="flex items-center gap-3">
                    <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all shadow-sm">
                        <Download className="w-4 h-4" />
                        Export
                    </button>
                    <RoleGuard>
                        <button 
                            onClick={() => setShowModal(true)}
                            className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-black hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all active:scale-95"
                        >
                            <Plus className="w-4 h-4" />
                            Issue Invoice
                        </button>
                    </RoleGuard>
                </div>
            </div>

            {/* Error Display */}
            <AnimatePresence>
                {error && (
                    <motion.div 
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-xl flex items-center justify-between"
                    >
                        <div className="flex items-center gap-3">
                            <AlertTriangle className="w-5 h-5 text-red-500" />
                            <span className="text-sm font-semibold">{error}</span>
                        </div>
                        <button onClick={() => setError(null)}><X className="w-4 h-4" /></button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Tab Navigation */}
            <div className="flex p-1 bg-slate-200/50 rounded-2xl w-full max-w-md shadow-inner">
                <button
                    onClick={() => setActiveTab('STANDARD')}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-black transition-all ${
                        activeTab === 'STANDARD' 
                        ? 'bg-white text-blue-600 shadow-md scale-[1.02]' 
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                >
                    Standard Submissions
                </button>
                <button
                    onClick={() => setActiveTab('INSTALLMENTS')}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-black transition-all ${
                        activeTab === 'INSTALLMENTS' 
                        ? 'bg-white text-blue-600 shadow-md scale-[1.02]' 
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                >
                    Active Installments
                </button>
            </div>

            {/* Main Content Table */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-100">
                                <th className="px-6 py-5 text-xs font-black text-slate-400 uppercase tracking-widest">Student Details</th>
                                <th className="px-6 py-5 text-xs font-black text-slate-400 uppercase tracking-widest text-right">
                                    {activeTab === 'STANDARD' ? 'Total Fee' : 'Current Installment'}
                                </th>
                                <th className="px-6 py-5 text-xs font-black text-slate-400 uppercase tracking-widest text-right">
                                    {activeTab === 'STANDARD' ? 'Outstanding' : 'Total Remaining'}
                                </th>
                                <th className="px-6 py-5 text-xs font-black text-slate-400 uppercase tracking-widest">
                                    {activeTab === 'STANDARD' ? 'Status' : 'Next Due'}
                                </th>
                                <th className="px-6 py-5 text-xs font-black text-slate-400 uppercase tracking-widest text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {loading ? (
                                <tr><td colSpan={5} className="py-20 text-center"><Loader2 className="w-10 h-10 animate-spin mx-auto text-blue-200" /></td></tr>
                            ) : filteredInvoices.length === 0 ? (
                                <tr><td colSpan={5} className="py-20 text-center text-slate-400 font-medium italic">No active records found for this view.</td></tr>
                            ) : filteredInvoices.map((inv, i) => (
                                <motion.tr 
                                    key={inv._id}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: i * 0.03 }}
                                    className="hover:bg-slate-50/80 transition-colors group"
                                >
                                    <td className="px-6 py-5">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-black text-xs">
                                                {(inv.studentName || (inv as any).studentProfileId?.name || '?').charAt(0)}
                                            </div>
                                            <div>
                                                <p className="font-black text-slate-900 leading-none mb-1">
                                                    {inv.studentName || (inv as any).studentProfileId?.name || 'Unknown Student'}
                                                </p>
                                                <p className="text-xs font-mono text-slate-400">
                                                    {inv.rollNumber || (inv as any).studentProfileId?.registrationNumber || 'N/A'} • {inv.program}
                                                </p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5 text-right font-black text-slate-700">
                                        {activeTab === 'STANDARD' ? (
                                            <span>Rs {inv.totalAmount.toLocaleString()}</span>
                                        ) : (
                                            <span className="text-blue-600">Rs {(inv.outstandingAmount / 2).toLocaleString()}*</span> 
                                        )}
                                    </td>
                                    <td className="px-6 py-5 text-right">
                                        <span className={`font-black ${inv.outstandingAmount > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                                            Rs {inv.outstandingAmount.toLocaleString()}
                                        </span>
                                    </td>
                                    <td className="px-6 py-5">
                                        {activeTab === 'STANDARD' ? (
                                            <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-tighter ${statusColors[inv.status]}`}>
                                                {inv.status}
                                            </span>
                                        ) : (
                                            <div className="flex items-center gap-2 text-slate-500 text-xs font-bold">
                                                <Calendar className="w-3.5 h-3.5" />
                                                {new Date(inv.dueDate).toLocaleDateString()}
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className="flex justify-end items-center gap-2">
                                            {inv.status !== 'PAID' && (
                                                <button 
                                                    onClick={() => handleQuickVerify(inv, activeTab === 'STANDARD' ? inv.outstandingAmount : inv.outstandingAmount / 2)}
                                                    disabled={!!saving}
                                                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all active:scale-95 shadow-lg ${
                                                        activeTab === 'STANDARD'
                                                        ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-100'
                                                        : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-100'
                                                    } disabled:opacity-50`}
                                                >
                                                    {saving === inv._id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
                                                    {activeTab === 'STANDARD' ? 'Verify Full Payment' : 'Verify Installment'}
                                                </button>
                                            )}

                                            <div className="relative">
                                                <button 
                                                    onClick={() => setSelectedActionRow(selectedActionRow === inv._id ? null : inv._id)}
                                                    className="p-2 hover:bg-slate-200 rounded-lg transition-colors text-slate-400"
                                                >
                                                    <MoreVertical className="w-4 h-4" />
                                                </button>
                                                
                                                {selectedActionRow === inv._id && (
                                                    <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-100 rounded-xl shadow-2xl z-20 py-2 animate-in fade-in slide-in-from-top-2">
                                                        <button 
                                                            onClick={() => { setShowOverrideModal(inv); setSelectedActionRow(null); }}
                                                            className="w-full text-left px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 flex items-center gap-2"
                                                        >
                                                            <Settings className="w-3.5 h-3.5" /> Customize Fee
                                                        </button>
                                                        <button 
                                                            onClick={() => { setShowInstallmentWizard(inv); setSelectedActionRow(null); }}
                                                            className="w-full text-left px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 flex items-center gap-2"
                                                        >
                                                            <LayoutList className="w-3.5 h-3.5" /> Split into Plan
                                                        </button>
                                                        <div className="h-px bg-slate-100 my-1"></div>
                                                        <button className="w-full text-left px-4 py-2 text-xs font-bold text-red-500 hover:bg-red-50 flex items-center gap-2">
                                                            <X className="w-3.5 h-3.5" /> Void Invoice
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                </motion.tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                
                {/* Pagination Placeholder */}
                <div className="px-8 py-5 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                        Showing Page {page} of {totalPages}
                    </p>
                    <div className="flex gap-2">
                        <Pagination currentPage={page} totalPages={totalPages} totalCount={totalCount} />
                    </div>
                </div>
            </div>

            {/* Modals & Wizards */}
            {showOverrideModal && (
                <FeeOverrideModal
                    isOpen={!!showOverrideModal}
                    onClose={() => setShowOverrideModal(null)}
                    invoice={showOverrideModal as any}
                    onSave={async (updatedData) => {
                        setSaving(showOverrideModal._id);
                        try {
                            const res = await fetch(`/api/finance/fee-invoices/${showOverrideModal._id}/override`, {
                                method: 'PUT',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify(updatedData),
                            });
                            if (!res.ok) throw new Error('Failed to override fee');
                            fetchInvoices();
                            setShowOverrideModal(null);
                        } catch (err: any) {
                            setError(err.message);
                        } finally {
                            setSaving(null);
                        }
                    }}
                />
            )}

            {showInstallmentWizard && (
                <InstallmentWizard
                    isOpen={!!showInstallmentWizard}
                    onClose={() => setShowInstallmentWizard(null)}
                    invoiceTotal={showInstallmentWizard.outstandingAmount}
                    studentId={showInstallmentWizard.rollNumber}
                    onSave={async (installments) => {
                        setSaving(showInstallmentWizard._id);
                        try {
                            const res = await fetch('/api/finance/installment-plans', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    feeInvoice: showInstallmentWizard._id,
                                    studentId: showInstallmentWizard.rollNumber,
                                    installments: installments.map((inst, i) => ({
                                        installmentNumber: i + 1,
                                        dueDate: inst.dueDate,
                                        amount: inst.amount
                                    }))
                                }),
                            });
                            if (!res.ok) throw new Error('Failed to save installment plan');
                            fetchInvoices();
                            setShowInstallmentWizard(null);
                        } catch (err: any) {
                            setError(err.message);
                        } finally {
                            setSaving(null);
                        }
                    }}
                />
            )}

            {/* Future Placeholder for New Invoice Modal */}
            {/* {showModal && <NewInvoiceModal ... />} */}
        </div>
    );
}

export default function FeeInvoicesClient() {
    return (
        <Suspense fallback={
            <div className="flex flex-col items-center justify-center h-screen bg-slate-50">
                <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
                <p className="mt-4 text-slate-500 font-bold animate-pulse">Initializing Fee Ledger...</p>
            </div>
        }>
            <FeeInvoicesClientContent />
        </Suspense>
    );
}
