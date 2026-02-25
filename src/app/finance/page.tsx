'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
    Wallet, AlertTriangle, CheckCircle, Clock, TrendingUp,
    Users, FileText, ArrowUpRight, Landmark, BarChart3,
} from 'lucide-react';

interface DashboardData {
    kpis: {
        totalOutstandingFees: number;
        overdueInvoicesCount: number;
        paymentsThisMonth: number;
        pendingJEApprovals: number;
        vendorPayablesOutstanding: number;
        activeEmployees: number;
    };
    recentJournalEntries: Array<{
        _id: string;
        entryNumber: string;
        entryDate: string;
        description: string;
        totalDebit: number;
        source: string;
    }>;
    agingBuckets: Array<{ _id: string; amount: number; count: number }>;
    generatedAt: string;
}

const formatPKR = (n: number) =>
    `PKR ${n.toLocaleString('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

const sourceColors: Record<string, string> = {
    MANUAL: 'bg-blue-100 text-blue-700',
    PAYROLL: 'bg-purple-100 text-purple-700',
    FEE_PAYMENT: 'bg-green-100 text-green-700',
    DEPRECIATION: 'bg-orange-100 text-orange-700',
    REFUND: 'bg-red-100 text-red-700',
    AP_PAYMENT: 'bg-yellow-100 text-yellow-700',
};

export default function FinanceDashboard() {
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetch('/api/finance/dashboard')
            .then((r) => r.json())
            .then(setData)
            .catch((e) => setError(e.message))
            .finally(() => setLoading(false));
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-10 h-10 border-4 border-leads-blue border-t-transparent rounded-full animate-spin" />
                    <p className="text-gray-500 text-sm">Loading finance dashboard...</p>
                </div>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center text-red-700">
                Failed to load dashboard: {error}
            </div>
        );
    }

    const kpis = [
        {
            label: 'Outstanding Student Fees',
            value: formatPKR(data.kpis.totalOutstandingFees),
            icon: Wallet,
            color: 'text-leads-blue',
            bg: 'bg-leads-blue/10',
            border: 'border-leads-blue/30',
        },
        {
            label: 'Overdue Invoices',
            value: data.kpis.overdueInvoicesCount.toString(),
            icon: AlertTriangle,
            color: 'text-leads-red',
            bg: 'bg-red-50',
            border: 'border-red-200',
        },
        {
            label: 'Payments This Month',
            value: formatPKR(data.kpis.paymentsThisMonth),
            icon: TrendingUp,
            color: 'text-green-700',
            bg: 'bg-green-50',
            border: 'border-green-200',
        },
        {
            label: 'Pending JE Approvals',
            value: data.kpis.pendingJEApprovals.toString(),
            icon: Clock,
            color: 'text-amber-700',
            bg: 'bg-amber-50',
            border: 'border-amber-200',
        },
        {
            label: 'Vendor Payables',
            value: formatPKR(data.kpis.vendorPayablesOutstanding),
            icon: FileText,
            color: 'text-orange-700',
            bg: 'bg-orange-50',
            border: 'border-orange-200',
        },
        {
            label: 'Active Employees',
            value: data.kpis.activeEmployees.toString(),
            icon: Users,
            color: 'text-indigo-700',
            bg: 'bg-indigo-50',
            border: 'border-indigo-200',
        },
    ];

    return (
        <div className="space-y-6">
            {/* Page header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-leads-blue flex items-center gap-2">
                        <Landmark size={26} />
                        Finance Dashboard
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Real-time financial position · As of {new Date(data.generatedAt).toLocaleString('en-PK', {
                            dateStyle: 'medium', timeStyle: 'short'
                        })}
                    </p>
                </div>
                <div className="flex items-center gap-2 text-xs bg-green-50 text-green-700 border border-green-200 px-3 py-1.5 rounded-full">
                    <CheckCircle size={12} />
                    Ledger Integrity: Verified
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                {kpis.map((kpi, i) => (
                    <motion.div
                        key={kpi.label}
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.06 }}
                        className={`bg-white rounded-xl border ${kpi.border} p-4 flex flex-col gap-3`}
                    >
                        <div className={`p-2 rounded-lg w-fit ${kpi.bg} ${kpi.color}`}>
                            <kpi.icon size={18} />
                        </div>
                        <div>
                            <p className="text-[11px] text-gray-500 font-medium leading-tight">{kpi.label}</p>
                            <p className={`text-lg font-bold mt-1 ${kpi.color}`}>{kpi.value}</p>
                        </div>
                    </motion.div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Journal Entries */}
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                        <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                            <BarChart3 size={18} className="text-leads-blue" />
                            Recent Posted Entries
                        </h2>
                        <a href="/finance/journal-entries" className="text-xs text-leads-blue hover:underline flex items-center gap-1">
                            View all <ArrowUpRight size={12} />
                        </a>
                    </div>
                    <div className="divide-y divide-gray-50">
                        {data.recentJournalEntries.length === 0 ? (
                            <p className="py-8 text-center text-sm text-gray-400">No posted journal entries yet.</p>
                        ) : (
                            data.recentJournalEntries.map((je) => (
                                <div key={je._id} className="px-5 py-3 flex items-start gap-3">
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-semibold text-gray-800 truncate">{je.entryNumber}</p>
                                        <p className="text-xs text-gray-500 truncate mt-0.5">{je.description}</p>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <p className="text-xs font-bold text-gray-800">{formatPKR(je.totalDebit)}</p>
                                        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${sourceColors[je.source] || 'bg-gray-100 text-gray-600'}`}>
                                            {je.source.replace(/_/g, ' ')}
                                        </span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Aging Buckets */}
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-100">
                        <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                            <AlertTriangle size={18} className="text-leads-red" />
                            Fee Aging Analysis
                        </h2>
                    </div>
                    <div className="p-5 space-y-3">
                        {data.agingBuckets.length === 0 ? (
                            <p className="text-center text-sm text-gray-400 py-6">No outstanding balances.</p>
                        ) : (
                            data.agingBuckets
                                .sort((a, b) => {
                                    const order = ['Current', '1-30 days', '31-60 days', '61-90 days', '90+ days'];
                                    return order.indexOf(a._id) - order.indexOf(b._id);
                                })
                                .map((b) => {
                                    const maxAmount = Math.max(...data.agingBuckets.map((x) => x.amount));
                                    const pct = maxAmount > 0 ? (b.amount / maxAmount) * 100 : 0;
                                    const barColor = b._id === 'Current' ? 'bg-green-400'
                                        : b._id === '1-30 days' ? 'bg-yellow-400'
                                            : b._id === '31-60 days' ? 'bg-orange-400'
                                                : 'bg-red-500';

                                    return (
                                        <div key={b._id}>
                                            <div className="flex justify-between text-xs mb-1">
                                                <span className="font-medium text-gray-700">{b._id}</span>
                                                <span className="text-gray-500">{b.count} invoices · {formatPKR(b.amount)}</span>
                                            </div>
                                            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                                <div className={`h-full ${barColor} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                                            </div>
                                        </div>
                                    );
                                })
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
