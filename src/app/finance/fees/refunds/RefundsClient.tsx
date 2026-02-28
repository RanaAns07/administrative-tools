'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Loader2, ArrowRightLeft, X, Check, RefreshCw, User } from 'lucide-react';

function formatPKR(n: number = 0) {
    return new Intl.NumberFormat('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
}

const TYPE_COLORS: Record<string, string> = {
    OVERPAYMENT: 'bg-emerald-50 text-emerald-700',
    SECURITY_DEPOSIT: 'bg-blue-50 text-blue-700',
    ADMISSION_CANCEL: 'bg-rose-50 text-rose-700',
    ADJUSTMENT: 'bg-amber-50 text-amber-700',
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function RefundsClient({ initialRefunds, wallets }: { initialRefunds: any[], wallets: any[] }) {
    const [search, setSearch] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Form state
    const [studentSearch, setStudentSearch] = useState('');
    const [isSearchingStudent, setIsSearchingStudent] = useState(false);
    const [foundStudents, setFoundStudents] = useState<any[]>([]);
    const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
    const [refundType, setRefundType] = useState('OVERPAYMENT');
    const [amount, setAmount] = useState<number | ''>('');
    const [walletId, setWalletId] = useState(wallets[0]?._id || '');
    const [reason, setReason] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const filtered = initialRefunds.filter(r =>
        r.refundNumber?.toLowerCase().includes(search.toLowerCase()) ||
        r.studentProfileId?.name?.toLowerCase().includes(search.toLowerCase()) ||
        r.studentProfileId?.registrationNumber?.toLowerCase().includes(search.toLowerCase())
    );

    const handleSearchStudent = async () => {
        if (!studentSearch.trim()) return;
        setIsSearchingStudent(true);
        try {
            const res = await fetch(`/api/finance/university/students?search=${encodeURIComponent(studentSearch)}`);
            if (res.ok) {
                const data = await res.json();
                setFoundStudents(data);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsSearchingStudent(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedStudent || !amount || !walletId || !reason) return;

        setIsSubmitting(true);
        setError(null);

        try {
            const res = await fetch('/api/finance/refunds', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    studentProfileId: selectedStudent._id,
                    refundType,
                    amount: Number(amount),
                    walletId,
                    reason
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to process refund');

            window.location.reload();
        } catch (err: any) {
            setError(err.message || 'An error occurred.');
            setIsSubmitting(false);
        }
    };

    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-4 sm:p-6 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="relative">
                    <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
                    <input type="text" placeholder="Search refunds by student or ID..." value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm w-80 focus:outline-none focus:ring-2 focus:ring-leads-blue"
                    />
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="bg-leads-blue hover:bg-blue-800 text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
                >
                    <ArrowRightLeft size={16} />
                    Process Refund
                </button>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-gray-50 text-gray-500 text-xs font-semibold uppercase border-b border-gray-100">
                        <tr>
                            <th className="px-6 py-3">Refund No</th>
                            <th className="px-6 py-3">Student</th>
                            <th className="px-6 py-3">Type</th>
                            <th className="px-6 py-3">Amount</th>
                            <th className="px-6 py-3">Processed Date</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {filtered.length === 0 ? (
                            <tr><td colSpan={5} className="py-16 text-center text-gray-400">
                                <RefreshCw className="mx-auto mb-2 text-gray-200" size={32} />
                                No refunds found.
                            </td></tr>
                        ) : filtered.map(r => (
                            <tr key={r._id} className="hover:bg-gray-50/50 transition-colors">
                                <td className="px-6 py-4 font-mono font-medium text-gray-900">{r.refundNumber}</td>
                                <td className="px-6 py-4">
                                    <div className="font-semibold text-gray-900">{r.studentProfileId?.name || 'Unknown'}</div>
                                    <div className="text-xs text-gray-500 font-mono">{r.studentProfileId?.registrationNumber || 'N/A'}</div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${TYPE_COLORS[r.refundType] || 'bg-gray-100 text-gray-600'}`}>
                                        {r.refundType.replace(/_/g, ' ')}
                                    </span>
                                </td>
                                <td className="px-6 py-4 font-bold text-gray-900">
                                    PKR {formatPKR(r.amount)}
                                </td>
                                <td className="px-6 py-4 text-gray-500">
                                    {new Date(r.processedAt).toLocaleDateString()}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm overflow-y-auto">
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg my-4"
                        >
                            <div className="flex justify-between items-center p-5 border-b border-gray-100">
                                <h2 className="font-bold text-leads-blue">Process New Refund</h2>
                                <button type="button" onClick={() => setIsModalOpen(false)}><X size={18} className="text-gray-400 hover:text-gray-600" /></button>
                            </div>

                            <div className="p-5 space-y-4">
                                {!selectedStudent ? (
                                    <div>
                                        <label className="text-xs font-semibold text-gray-600 mb-1 block">Search Student</label>
                                        <div className="flex gap-2 mb-2">
                                            <div className="relative flex-1">
                                                <User className="absolute left-3 top-2 text-gray-400" size={16} />
                                                <input
                                                    type="text"
                                                    value={studentSearch}
                                                    onChange={e => setStudentSearch(e.target.value)}
                                                    onKeyDown={e => e.key === 'Enter' && handleSearchStudent()}
                                                    placeholder="Registration Number or Name..."
                                                    className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-leads-blue"
                                                />
                                            </div>
                                            <button
                                                onClick={handleSearchStudent}
                                                disabled={isSearchingStudent}
                                                className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
                                            >
                                                {isSearchingStudent ? <Loader2 size={16} className="animate-spin" /> : 'Search'}
                                            </button>
                                        </div>

                                        {foundStudents.length > 0 && (
                                            <div className="border border-gray-200 rounded-lg max-h-48 overflow-y-auto">
                                                {foundStudents.map(s => (
                                                    <div
                                                        key={s._id}
                                                        onClick={() => setSelectedStudent(s)}
                                                        className="p-3 border-b border-gray-100 last:border-b-0 hover:bg-leads-blue/5 cursor-pointer flex justify-between items-center"
                                                    >
                                                        <div>
                                                            <div className="font-semibold text-sm">{s.name}</div>
                                                            <div className="text-xs text-gray-500 font-mono">{s.registrationNumber}</div>
                                                        </div>
                                                        <Check size={16} className="text-gray-300" />
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <form onSubmit={handleSubmit} className="space-y-4">
                                        <div className="bg-blue-50/50 p-3 rounded-xl border border-blue-100 flex justify-between items-center">
                                            <div>
                                                <div className="font-semibold text-sm text-leads-blue">{selectedStudent.name}</div>
                                                <div className="text-xs text-blue-600 font-mono mt-0.5">{selectedStudent.registrationNumber}</div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => setSelectedStudent(null)}
                                                className="text-xs text-blue-600 font-semibold hover:underline"
                                            >
                                                Change
                                            </button>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-xs font-semibold text-gray-600 mb-1 block">Refund Type</label>
                                                <select
                                                    required
                                                    value={refundType}
                                                    onChange={e => setRefundType(e.target.value)}
                                                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-leads-blue bg-white"
                                                >
                                                    <option value="OVERPAYMENT">Overpayment</option>
                                                    <option value="SECURITY_DEPOSIT">Security Deposit</option>
                                                    <option value="ADMISSION_CANCEL">Admission Cancelled</option>
                                                    <option value="ADJUSTMENT">Adjustment</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="text-xs font-semibold text-gray-600 mb-1 block">Wallet (Source of Funds)</label>
                                                <select
                                                    required
                                                    value={walletId}
                                                    onChange={e => setWalletId(e.target.value)}
                                                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-leads-blue bg-white"
                                                >
                                                    {wallets.map((w: any) => (
                                                        <option key={w._id} value={w._id}>{w.name} (Bal: {formatPKR(w.balance)})</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="text-xs font-semibold text-gray-600 mb-1 block">Amount (PKR)</label>
                                            <input
                                                required
                                                type="number"
                                                step="0.01"
                                                min="1"
                                                value={amount}
                                                onChange={e => setAmount(e.target.value ? Number(e.target.value) : '')}
                                                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-base font-medium focus:outline-none focus:ring-2 focus:ring-leads-blue"
                                            />
                                        </div>

                                        <div>
                                            <label className="text-xs font-semibold text-gray-600 mb-1 block">Reason / Description</label>
                                            <input
                                                required
                                                type="text"
                                                value={reason}
                                                onChange={e => setReason(e.target.value)}
                                                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-leads-blue"
                                                placeholder="e.g. Returning excess fees from Fall 2024..."
                                            />
                                        </div>

                                        {error && <p className="text-red-600 text-xs bg-red-50 rounded-lg px-3 py-2 border border-red-100">{error}</p>}

                                        <div className="flex gap-3 pt-2">
                                            <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 border border-gray-200 rounded-xl py-2.5 text-sm text-gray-600 hover:bg-gray-50 font-medium transition-colors">Cancel</button>
                                            <button type="submit" disabled={isSubmitting || !amount || amount <= 0} className="flex-1 bg-leads-blue text-white rounded-xl py-2.5 text-sm font-medium hover:bg-blue-800 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors">
                                                {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <ArrowRightLeft size={16} />}
                                                {isSubmitting ? 'Processing...' : 'Process Refund'}
                                            </button>
                                        </div>
                                    </form>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
