'use client';

import { useState } from 'react';
import { BarChart3, TrendingUp, PieChart, Users, DollarSign } from 'lucide-react';

function formatPKR(n: number = 0) {
    return new Intl.NumberFormat('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function FeeReportsClient({ summaryMetrics, recentInvoices }: { summaryMetrics: any, recentInvoices: any[] }) {
    const [activeTab, setActiveTab] = useState('overview');

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex items-start gap-4">
                    <div className="p-3 bg-blue-50 text-leads-blue rounded-xl"><DollarSign size={20} /></div>
                    <div>
                        <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1">Total Invoiced</p>
                        <p className="text-2xl font-bold text-gray-900">PKR {formatPKR(summaryMetrics.totalInvoiced)}</p>
                    </div>
                </div>
                <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex items-start gap-4">
                    <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl"><TrendingUp size={20} /></div>
                    <div>
                        <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1">Total Collected</p>
                        <p className="text-2xl font-bold text-gray-900">PKR {formatPKR(summaryMetrics.totalCollected)}</p>
                    </div>
                </div>
                <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex items-start gap-4">
                    <div className="p-3 bg-rose-50 text-rose-600 rounded-xl"><BarChart3 size={20} /></div>
                    <div>
                        <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1">Total Arrears</p>
                        <p className="text-2xl font-bold text-gray-900">PKR {formatPKR(summaryMetrics.totalArrears)}</p>
                    </div>
                </div>
                <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex items-start gap-4">
                    <div className="p-3 bg-purple-50 text-purple-600 rounded-xl"><Users size={20} /></div>
                    <div>
                        <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1">Advance Balances</p>
                        <p className="text-2xl font-bold text-gray-900">PKR {formatPKR(summaryMetrics.totalAdvances)}</p>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="border-b border-gray-100 p-2 flex gap-2">
                    <button
                        onClick={() => setActiveTab('overview')}
                        className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${activeTab === 'overview' ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Collection Overview
                    </button>
                    <button
                        onClick={() => setActiveTab('recent')}
                        className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${activeTab === 'recent' ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Recent Activity
                    </button>
                </div>

                <div className="p-6">
                    {activeTab === 'overview' ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center text-gray-400">
                            <PieChart size={48} className="mb-4 text-gray-200" />
                            <h3 className="text-gray-600 font-medium">Detailed Analytics Pending</h3>
                            <p className="text-sm mt-1 max-w-sm">Full visual charts and analytics for fee collections will be integrated into the central reporting dashboard.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <h3 className="font-semibold text-gray-900">Latest Invoices Generated</h3>
                            <div className="overflow-x-auto border border-gray-100 rounded-xl">
                                <table className="w-full text-left text-sm whitespace-nowrap">
                                    <thead className="bg-gray-50 text-gray-500 text-xs font-semibold uppercase border-b border-gray-100">
                                        <tr>
                                            <th className="px-6 py-3">Invoice No</th>
                                            <th className="px-6 py-3">Student</th>
                                            <th className="px-6 py-3">Total Amount</th>
                                            <th className="px-6 py-3">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50 text-gray-700">
                                        {recentInvoices.map((inv: any) => (
                                            <tr key={inv._id}>
                                                <td className="px-6 py-4 font-mono">{inv.invoiceNumber}</td>
                                                <td className="px-6 py-4">{inv.studentProfileId?.name || 'Unknown'}</td>
                                                <td className="px-6 py-4 font-semibold">PKR {formatPKR(inv.totalAmount - inv.discountAmount)}</td>
                                                <td className="px-6 py-4">
                                                    <span className={`text-[10px] px-2 py-1 rounded-full font-bold uppercase ${inv.status === 'PAID' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
                                                        {inv.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
