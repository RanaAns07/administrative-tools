'use client';

import { useState } from 'react';
import { Search, Wallet, FileText, CheckCircle2, RotateCcw } from 'lucide-react';

function formatPKR(n: number = 0) {
    return new Intl.NumberFormat('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
}

const STATUS_COLORS: Record<string, string> = {
    APPROVED: 'bg-emerald-50 text-emerald-700',
    PENDING: 'bg-amber-50 text-amber-700',
    REJECTED: 'bg-rose-50 text-rose-700',
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function FeePaymentsClient({ initialPayments }: { initialPayments: any[] }) {
    const [search, setSearch] = useState('');

    const filtered = initialPayments.filter(p =>
        p.receiptNumber?.toLowerCase().includes(search.toLowerCase()) ||
        p.feeInvoice?.studentProfileId?.name?.toLowerCase().includes(search.toLowerCase()) ||
        p.feeInvoice?.studentProfileId?.registrationNumber?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-4 sm:p-6 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="relative">
                    <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
                    <input type="text" placeholder="Search by receipt or student..." value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm w-80 focus:outline-none focus:ring-2 focus:ring-leads-blue"
                    />
                </div>
                <div className="flex text-sm text-gray-500 font-medium">
                    {filtered.length} matching records
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-gray-50 text-gray-500 text-xs font-semibold uppercase border-b border-gray-100">
                        <tr>
                            <th className="px-6 py-3">Receipt No</th>
                            <th className="px-6 py-3">Student</th>
                            <th className="px-6 py-3">Amount</th>
                            <th className="px-6 py-3">Mode</th>
                            <th className="px-6 py-3">Date</th>
                            <th className="px-6 py-3">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {filtered.length === 0 ? (
                            <tr><td colSpan={6} className="py-16 text-center text-gray-400">
                                <FileText className="mx-auto mb-2 text-gray-200" size={32} />
                                No payments found.
                            </td></tr>
                        ) : filtered.map(p => {
                            const student = p.feeInvoice?.studentProfileId || {};
                            return (
                                <tr key={p._id} className={`hover:bg-gray-50/50 transition-colors ${p.isReversal ? 'opacity-60 bg-red-50/20' : ''}`}>
                                    <td className="px-6 py-4">
                                        <div className="font-mono font-semibold text-gray-900 flex items-center gap-2">
                                            {p.isReversal && <span title="Reversal"><RotateCcw size={14} className="text-red-500" /></span>}
                                            {p.receiptNumber}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="font-semibold text-gray-900">{student.name || 'N/A'}</div>
                                        <div className="text-xs text-gray-500 font-mono">{student.registrationNumber || 'N/A'}</div>
                                    </td>
                                    <td className="px-6 py-4 font-bold text-gray-900">
                                        PKR {formatPKR(p.amount)}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-xs px-2 py-1 bg-gray-100 rounded-md font-semibold text-gray-600">
                                            {p.paymentMode}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-gray-500">
                                        {new Date(p.paymentDate).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold uppercase ${STATUS_COLORS[p.status] || 'bg-gray-100 text-gray-600'}`}>
                                            {p.status}
                                        </span>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
