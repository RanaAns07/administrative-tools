'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Loader2, Wallet, Check, X, User, FileText, AlertCircle, Clock } from 'lucide-react';

function formatPKR(n: number = 0) {
    return new Intl.NumberFormat('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
}

const statusColors: Record<string, string> = {
    PENDING: 'bg-yellow-100 text-yellow-700',
    PARTIAL: 'bg-blue-100 text-blue-700',
    PAID: 'bg-green-100 text-green-700',
    OVERDUE: 'bg-red-100 text-red-700',
    WAIVED: 'bg-gray-100 text-gray-700',
};

export default function FeeReceiveForm({ wallets, categories }: { wallets: any[], categories: any[] }) {
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [invoices, setInvoices] = useState<any[]>([]);
    const [hasSearched, setHasSearched] = useState(false);

    const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);
    const [payAmount, setPayAmount] = useState<number | ''>('');
    const [selectedWalletId, setSelectedWalletId] = useState(wallets[0]?._id || '');
    const [selectedCategoryId, setSelectedCategoryId] = useState(categories.find(c => c.name?.toLowerCase().includes('fee'))?._id || categories[0]?._id || '');
    const [notes, setNotes] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const handleSearch = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!searchQuery.trim()) return;

        setIsSearching(true);
        setHasSearched(true);
        setInvoices([]);
        setSelectedInvoice(null);
        setError(null);
        setSuccessMessage(null);

        try {
            const res = await fetch(`/api/finance/fee-collection?search=${encodeURIComponent(searchQuery)}`);
            if (!res.ok) throw new Error('Search failed');
            const data = await res.json();
            setInvoices(Array.isArray(data) ? data : []);
        } catch (err: any) {
            setError(err.message || 'Failed to search invoices.');
        } finally {
            setIsSearching(false);
        }
    };

    const handleSelectInvoice = (inv: any) => {
        if (inv.status === 'PAID' || inv.status === 'WAIVED') return;
        setSelectedInvoice(inv);
        setPayAmount(inv.arrears);
        setError(null);
        setSuccessMessage(null);
    };

    const handlePayment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedInvoice || !payAmount) return;

        setIsSubmitting(true);
        setError(null);
        setSuccessMessage(null);

        try {
            const res = await fetch('/api/finance/fee-collection', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    invoiceId: selectedInvoice._id,
                    amountToPay: Number(payAmount),
                    walletId: selectedWalletId,
                    categoryId: selectedCategoryId,
                    notes: notes.trim() || undefined,
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Payment failed');

            setSuccessMessage(`Payment of PKR ${formatPKR(Number(payAmount))} received successfully.`);
            setSelectedInvoice(null);
            setPayAmount('');
            setNotes('');

            // Refresh search results implicitly to show updated invoice status
            handleSearch();
        } catch (err: any) {
            setError(err.message || 'An error occurred during payment.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="max-w-[1000px] space-y-6">
            <div>
                <span className="text-xs font-semibold text-leads-blue uppercase tracking-widest">Fee Collection</span>
                <h1 className="text-2xl font-bold text-gray-900 tracking-tight mt-0.5">Receive Payment</h1>
                <p className="text-sm text-gray-400">Search for a student to view and pay outstanding fee challans.</p>
            </div>

            {/* Search Bar */}
            <form onSubmit={handleSearch} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 flex items-end gap-4">
                <div className="flex-1">
                    <label className="text-sm font-semibold text-gray-700 block mb-2">Search Student</label>
                    <div className="relative">
                        <User className="absolute left-3 top-3 text-gray-400" size={18} />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Enter Registration Number (e.g. FA24-BSCS) or Name"
                            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-leads-blue focus:bg-white transition-all"
                        />
                    </div>
                </div>
                <button
                    type="submit"
                    disabled={isSearching || !searchQuery.trim()}
                    className="bg-leads-blue hover:bg-blue-800 text-white px-6 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 transition-colors disabled:opacity-50"
                >
                    {isSearching ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                    Find Invoices
                </button>
            </form>

            {error && !selectedInvoice && (
                <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-start gap-3">
                    <AlertCircle size={20} className="shrink-0 mt-0.5" />
                    <p className="text-sm">{error}</p>
                </div>
            )}

            {successMessage && !selectedInvoice && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl flex items-start gap-3">
                    <Check size={20} className="shrink-0 mt-0.5" />
                    <p className="text-sm font-medium">{successMessage}</p>
                </div>
            )}

            {/* Results */}
            {hasSearched && invoices.length === 0 && !isSearching && !error && (
                <div className="bg-white rounded-2xl border border-gray-200 p-16 text-center text-gray-400">
                    <Search size={48} className="mx-auto mb-4 opacity-20" />
                    <p className="font-medium text-gray-600">No invoices found</p>
                    <p className="text-sm mt-1">Check the registration number or name and try again.</p>
                </div>
            )}

            {invoices.length > 0 && (
                <div className="space-y-4">
                    <h3 className="font-semibold text-gray-900 border-b pb-2">Matching Student Invoices</h3>
                    <div className="grid gap-4 sm:grid-cols-2">
                        {invoices.map((inv) => {
                            const student = inv.studentProfileId || {};
                            const isActive = inv.status !== 'PAID' && inv.status !== 'WAIVED';

                            return (
                                <div
                                    key={inv._id}
                                    onClick={() => isActive && handleSelectInvoice(inv)}
                                    className={`bg-white rounded-2xl border p-5 relative overflow-hidden transition-all ${isActive
                                            ? 'border-gray-200 hover:border-leads-blue cursor-pointer hover:shadow-md'
                                            : 'border-gray-100 opacity-60 cursor-not-allowed'
                                        }`}
                                >
                                    <div className="flex justify-between items-start mb-3">
                                        <div>
                                            <p className="font-bold text-gray-900 text-sm">{student.name}</p>
                                            <p className="text-xs text-gray-500 font-mono mt-0.5">{student.registrationNumber}</p>
                                        </div>
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusColors[inv.status] || 'bg-gray-100'}`}>
                                            {inv.status}
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-4 mt-1">
                                        <FileText size={12} />
                                        <span>Invoice: {inv._id.substring(18)}</span>
                                        <span className="mx-1">•</span>
                                        <Clock size={12} className={new Date() > new Date(inv.dueDate) && isActive ? 'text-red-500' : ''} />
                                        <span className={new Date() > new Date(inv.dueDate) && isActive ? 'text-red-600 font-medium' : ''}>
                                            Due {new Date(inv.dueDate).toLocaleDateString()}
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2 bg-gray-50 rounded-xl p-3 border border-gray-100/50">
                                        <div>
                                            <p className="text-[10px] text-gray-500 tracking-wide uppercase">Total</p>
                                            <p className="text-sm font-semibold text-gray-700">PKR {formatPKR(inv.totalAmount - inv.discountAmount)}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[10px] text-gray-500 tracking-wide uppercase">Arrears</p>
                                            <p className={`text-sm font-bold ${inv.arrears > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                                PKR {formatPKR(inv.arrears)}
                                            </p>
                                        </div>
                                    </div>

                                    {isActive && (
                                        <div className="mt-4 pt-3 border-t border-gray-100 flex justify-end">
                                            <span className="text-xs font-semibold text-leads-blue">Pay Now →</span>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Payment Modal */}
            <AnimatePresence>
                {selectedInvoice && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm overflow-y-auto">
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg my-4"
                        >
                            <div className="flex justify-between items-center p-5 border-b border-gray-100">
                                <h2 className="font-bold text-leads-blue">Record Payment</h2>
                                <button type="button" onClick={() => setSelectedInvoice(null)}><X size={18} className="text-gray-400 hover:text-gray-600" /></button>
                            </div>

                            <div className="px-5 py-4 bg-gray-50/50 border-b border-gray-100">
                                <p className="text-sm font-semibold text-gray-800">{selectedInvoice.studentProfileId?.name}</p>
                                <p className="text-xs text-gray-500 mt-0.5">{selectedInvoice.studentProfileId?.registrationNumber} · Invoice Due: {new Date(selectedInvoice.dueDate).toLocaleDateString()}</p>
                                <div className="mt-3 flex gap-4 text-sm bg-white p-3 rounded-xl border border-gray-200">
                                    <div className="flex-1">
                                        <p className="text-xs text-gray-400">Total Billed</p>
                                        <p className="font-semibold text-gray-700">PKR {formatPKR(selectedInvoice.totalAmount - selectedInvoice.discountAmount + selectedInvoice.penaltyAmount)}</p>
                                    </div>
                                    <div className="flex-1 border-l pl-4">
                                        <p className="text-xs text-gray-400">Paid So Far</p>
                                        <p className="font-semibold text-gray-700">PKR {formatPKR(selectedInvoice.amountPaid)}</p>
                                    </div>
                                    <div className="flex-1 border-l pl-4">
                                        <p className="text-xs text-gray-400">Oustanding</p>
                                        <p className="font-bold text-rose-600">PKR {formatPKR(selectedInvoice.arrears)}</p>
                                    </div>
                                </div>
                            </div>

                            <form onSubmit={handlePayment} className="p-5 space-y-4">
                                <div>
                                    <label className="text-xs font-semibold text-gray-600 mb-1 block">Amount to Pay (PKR)</label>
                                    <input
                                        required
                                        type="number"
                                        step="0.01"
                                        min="1"
                                        max={selectedInvoice.arrears}
                                        value={payAmount}
                                        onChange={e => setPayAmount(e.target.value ? Number(e.target.value) : '')}
                                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-base font-medium focus:outline-none focus:ring-2 focus:ring-leads-blue transition-shadow"
                                    />
                                    <p className="text-[10px] text-gray-400 mt-1">Maximum payable: PKR {formatPKR(selectedInvoice.arrears)}</p>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs font-semibold text-gray-600 mb-1 block">Receiving Wallet</label>
                                        <select
                                            required
                                            value={selectedWalletId}
                                            onChange={e => setSelectedWalletId(e.target.value)}
                                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-leads-blue bg-white"
                                        >
                                            {wallets.map(w => (
                                                <option key={w._id} value={w._id}>{w.name} ({w.type})</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold text-gray-600 mb-1 block">Income Category</label>
                                        <select
                                            required
                                            value={selectedCategoryId}
                                            onChange={e => setSelectedCategoryId(e.target.value)}
                                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-leads-blue bg-white"
                                        >
                                            {categories.map(c => (
                                                <option key={c._id} value={c._id}>{c.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-gray-600 mb-1 block">Notes (Optional)</label>
                                    <input
                                        value={notes}
                                        onChange={e => setNotes(e.target.value)}
                                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-leads-blue"
                                        placeholder="Cash receipt number, check details..."
                                    />
                                </div>

                                {error && <p className="text-red-600 text-xs bg-red-50 rounded-lg px-3 py-2 border border-red-100">{error}</p>}

                                <div className="flex gap-3 pt-4">
                                    <button type="button" onClick={() => setSelectedInvoice(null)} className="flex-1 border border-gray-200 rounded-xl py-2.5 text-sm text-gray-600 hover:bg-gray-50 font-medium transition-colors">Cancel</button>
                                    <button type="submit" disabled={isSubmitting || !payAmount || payAmount <= 0} className="flex-1 bg-green-600 text-white rounded-xl py-2.5 text-sm font-medium hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors">
                                        {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Wallet size={16} />}
                                        {isSubmitting ? 'Processing...' : 'Confirm Payment'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
