'use client';

/**
 * @file DashboardClient.tsx
 * @description Executive Finance Dashboard — Interactive Client Layer
 *
 * Receives pre-fetched analytics data from the Server Component (page.tsx)
 * and renders the premium fintech UI. All interactivity and animations
 * live here while data fetching stays on the server.
 */

import { motion } from 'framer-motion';
import {
    Landmark, TrendingUp, TrendingDown, ArrowRightLeft,
    Wallet, ArrowUpRight, ArrowDownRight, Minus,
    Activity, LayoutGrid, RefreshCw,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface WalletGroup { _id: string; total: number; wallets: any[] }
interface CategorySpend { _id: string; categoryName: string; total: number; count: number }
interface RecentTxn { _id: string; amount: number; type: string; date: string; notes?: string; referenceType?: string; walletName: string; categoryName?: string }
interface AgingBucket { _id: string; amount: number; count: number }

interface AnalyticsData {
    cashPosition: { totalLiquidAssets: number; byType: WalletGroup[] };
    monthlyInflow: { total: number; transactionCount: number };
    monthlyOutflow: { total: number; transactionCount: number };
    netCashFlow: number;
    outflowByCategory: CategorySpend[];
    recentTransactions: RecentTxn[];
    feeAging: AgingBucket[];
    period: { month: string; year: number };
    generatedAt: string;
}

interface Props { data: AnalyticsData | null }

// ─── Helpers ─────────────────────────────────────────────────────────────────

const formatPKR = (n: number) =>
    new Intl.NumberFormat('en-PK', {
        notation: n >= 1_000_000 ? 'compact' : 'standard',
        maximumFractionDigits: n >= 1_000_000 ? 1 : 0,
    }).format(n);

const fullPKR = (n: number) =>
    `PKR ${new Intl.NumberFormat('en-PK', { maximumFractionDigits: 0 }).format(n)}`;

const fadeUp = (delay = 0) => ({
    initial: { opacity: 0, y: 18 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.45, delay, ease: 'easeOut' as const },
});

const AGING_ORDER = ['Current', '1–30 days', '31–60 days', '61–90 days', '90+ days'];
const AGING_COLORS = ['bg-emerald-400', 'bg-amber-400', 'bg-orange-400', 'bg-rose-400', 'bg-rose-600'];

const walletTypeLabel: Record<string, string> = {
    BANK: 'Bank Accounts',
    CASH: 'Cash in Hand',
    INVESTMENT: 'Investments',
};

const refTypeLabel: Record<string, string> = {
    FEE_INVOICE: 'Student Fee',
    PAYROLL_SLIP: 'Salary',
    VENDOR_BILL: 'Vendor Payment',
    EXPENSE_RECORD: 'Expense',
    MANUAL: 'Manual Entry',
};

// ─── Sub-Components ───────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, icon: Icon, accent, delay }: {
    label: string; value: string; sub?: string;
    icon: React.ElementType; accent: string; delay: number;
}) {
    return (
        <motion.div
            {...fadeUp(delay)}
            className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col gap-4 hover:shadow-md transition-shadow"
        >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${accent}`}>
                <Icon size={20} />
            </div>
            <div>
                <p className="text-3xl font-bold text-gray-900 tracking-tight leading-none">{value}</p>
                {sub && <p className="text-xs text-gray-400 mt-1.5">{sub}</p>}
            </div>
            <p className="text-sm font-medium text-gray-500">{label}</p>
        </motion.div>
    );
}

function CashFlowBars({ inflow, outflow, month, year }: {
    inflow: number; outflow: number; month: string; year: number;
}) {
    const max = Math.max(inflow, outflow, 1);
    const inflowPct = (inflow / max) * 100;
    const outflowPct = (outflow / max) * 100;

    return (
        <motion.div {...fadeUp(0.35)} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="font-semibold text-gray-900 text-base">Cash Flow</h2>
                    <p className="text-xs text-gray-400 mt-0.5">{month} {year}</p>
                </div>
                <span className="flex items-center gap-1.5 text-xs bg-gray-50 border border-gray-100 text-gray-500 px-2.5 py-1 rounded-full">
                    <Activity size={11} /> Live
                </span>
            </div>

            <div className="space-y-5">
                {/* Inflow bar */}
                <div>
                    <div className="flex justify-between items-center mb-2">
                        <span className="flex items-center gap-2 text-sm font-medium text-gray-700">
                            <ArrowUpRight size={15} className="text-emerald-500" />
                            Money In
                        </span>
                        <span className="text-sm font-bold text-emerald-600">{fullPKR(inflow)}</span>
                    </div>
                    <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                        <motion.div
                            className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${inflowPct}%` }}
                            transition={{ duration: 1, delay: 0.5, ease: 'easeOut' }}
                        />
                    </div>
                </div>

                {/* Outflow bar */}
                <div>
                    <div className="flex justify-between items-center mb-2">
                        <span className="flex items-center gap-2 text-sm font-medium text-gray-700">
                            <ArrowDownRight size={15} className="text-rose-500" />
                            Money Out
                        </span>
                        <span className="text-sm font-bold text-rose-600">{fullPKR(outflow)}</span>
                    </div>
                    <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                        <motion.div
                            className="h-full bg-gradient-to-r from-rose-400 to-rose-500 rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${outflowPct}%` }}
                            transition={{ duration: 1, delay: 0.65, ease: 'easeOut' }}
                        />
                    </div>
                </div>

                {/* Net */}
                <div className="pt-4 border-t border-gray-100">
                    <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <Minus size={13} className="text-gray-400" />
                            Net Flow
                        </span>
                        <span className={`text-base font-bold ${inflow >= outflow ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {inflow >= outflow ? '+' : ''}{fullPKR(inflow - outflow)}
                        </span>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}

function SpendingBreakdown({ categories, totalOutflow }: { categories: CategorySpend[]; totalOutflow: number }) {
    const palette = [
        'bg-violet-500', 'bg-indigo-500', 'bg-blue-500', 'bg-amber-500',
        'bg-orange-500', 'bg-rose-500', 'bg-teal-500', 'bg-cyan-500',
    ];

    if (categories.length === 0) {
        return (
            <motion.div {...fadeUp(0.4)} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <h2 className="font-semibold text-gray-900 text-base mb-2">Where Money Went</h2>
                <p className="text-sm text-gray-400 py-8 text-center">No outflow this month.</p>
            </motion.div>
        );
    }

    const max = categories[0].total;

    return (
        <motion.div {...fadeUp(0.4)} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="font-semibold text-gray-900 text-base">Where Money Went</h2>
                    <p className="text-xs text-gray-400 mt-0.5">By category this month</p>
                </div>
                <span className="text-[11px] bg-gray-50 text-gray-400 border border-gray-100 px-2 py-0.5 rounded-full">
                    {categories.length} categories
                </span>
            </div>
            <div className="space-y-4">
                {categories.map((cat, i) => {
                    const pct = totalOutflow > 0 ? Math.round((cat.total / totalOutflow) * 100) : 0;
                    const barPct = max > 0 ? (cat.total / max) * 100 : 0;
                    return (
                        <div key={cat._id}>
                            <div className="flex justify-between items-center mb-1.5">
                                <span className="flex items-center gap-2 text-sm text-gray-700">
                                    <span className={`w-2 h-2 rounded-full ${palette[i % palette.length]}`} />
                                    {cat.categoryName}
                                </span>
                                <span className="text-xs text-gray-500">{pct}% · {fullPKR(cat.total)}</span>
                            </div>
                            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                <motion.div
                                    className={`h-full rounded-full ${palette[i % palette.length]}`}
                                    initial={{ width: 0 }}
                                    animate={{ width: `${barPct}%` }}
                                    transition={{ duration: 0.8, delay: 0.5 + i * 0.06, ease: 'easeOut' }}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>
        </motion.div>
    );
}

function ActivityFeed({ transactions }: { transactions: RecentTxn[] }) {
    return (
        <motion.div {...fadeUp(0.5)} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <h2 className="font-semibold text-gray-900 text-base">Recent Activity</h2>
                <a href="/finance/cash-bank" className="text-xs text-leads-blue hover:underline flex items-center gap-1">
                    See all <ArrowUpRight size={12} />
                </a>
            </div>
            <div className="divide-y divide-gray-50">
                {transactions.length === 0 ? (
                    <p className="py-10 text-center text-sm text-gray-400">No transactions yet.</p>
                ) : (
                    transactions.map((tx, i) => {
                        const isIn = tx.type === 'IN';
                        const label = tx.notes
                            || (tx.referenceType ? refTypeLabel[tx.referenceType] || tx.referenceType : 'Transaction');
                        const dateStr = new Date(tx.date).toLocaleDateString('en-PK', {
                            day: 'numeric', month: 'short',
                        });
                        return (
                            <motion.div
                                key={tx._id}
                                initial={{ opacity: 0, x: -8 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.5 + i * 0.04 }}
                                className="px-6 py-3.5 flex items-center gap-4 hover:bg-gray-50/60 transition-colors"
                            >
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isIn ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                                    }`}>
                                    {isIn ? <ArrowUpRight size={15} /> : <ArrowDownRight size={15} />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm text-gray-800 font-medium truncate">{label}</p>
                                    <p className="text-xs text-gray-400 mt-0.5">{tx.walletName} · {dateStr}</p>
                                </div>
                                <span className={`text-sm font-bold shrink-0 ${isIn ? 'text-emerald-600' : 'text-rose-600'}`}>
                                    {isIn ? '+' : '−'} PKR {formatPKR(tx.amount)}
                                </span>
                            </motion.div>
                        );
                    })
                )}
            </div>
        </motion.div>
    );
}

function WalletBreakdown({ byType }: { byType: WalletGroup[] }) {
    const typeIcon: Record<string, React.ReactNode> = {
        BANK: <Landmark size={14} />,
        CASH: <Wallet size={14} />,
        INVESTMENT: <TrendingUp size={14} />,
    };
    return (
        <motion.div {...fadeUp(0.25)} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="font-semibold text-gray-900 text-base mb-4">Wallet Breakdown</h2>
            {byType.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">No active wallets.</p>
            ) : (
                <div className="space-y-3">
                    {byType.map((g) => (
                        <div key={g._id}>
                            <div className="flex justify-between items-center mb-2">
                                <span className="flex items-center gap-2 text-sm text-gray-600">
                                    <span className="text-gray-400">{typeIcon[g._id]}</span>
                                    {walletTypeLabel[g._id] || g._id}
                                </span>
                                <span className="text-sm font-bold text-gray-900">{fullPKR(g.total)}</span>
                            </div>
                            {g.wallets.map((w: any) => (
                                <div key={w.name} className="flex justify-between text-xs text-gray-400 ml-5 mb-1">
                                    <span className="truncate">{w.name}</span>
                                    <span className="ml-2 shrink-0">{fullPKR(w.balance)}</span>
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
            )}
        </motion.div>
    );
}

function FeeAgingPanel({ buckets }: { buckets: AgingBucket[] }) {
    const sortedBuckets = AGING_ORDER
        .map((label) => ({
            label,
            data: buckets.find((b) => b._id === label),
        }))
        .filter((b) => b.data);

    const max = Math.max(...buckets.map((b) => b.amount), 1);

    return (
        <motion.div {...fadeUp(0.55)} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="font-semibold text-gray-900 text-base mb-1">Outstanding Fee Ageing</h2>
            <p className="text-xs text-gray-400 mb-5">Unpaid & partially paid student invoices</p>
            {sortedBuckets.length === 0 ? (
                <div className="py-8 text-center">
                    <p className="text-sm text-emerald-600 font-medium">✓ All fees up to date</p>
                    <p className="text-xs text-gray-400 mt-1">No outstanding balances</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {sortedBuckets.map(({ label, data }, i) => {
                        const pct = data ? (data.amount / max) * 100 : 0;
                        return (
                            <div key={label}>
                                <div className="flex justify-between text-xs mb-1.5">
                                    <span className="font-medium text-gray-700">{label}</span>
                                    <span className="text-gray-400">
                                        {data?.count} invoice{data?.count !== 1 ? 's' : ''} · {fullPKR(data?.amount || 0)}
                                    </span>
                                </div>
                                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                    <motion.div
                                        className={`h-full ${AGING_COLORS[i]} rounded-full`}
                                        initial={{ width: 0 }}
                                        animate={{ width: `${pct}%` }}
                                        transition={{ duration: 0.8, delay: 0.6 + i * 0.08, ease: 'easeOut' }}
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </motion.div>
    );
}

// ─── Main Client Component ────────────────────────────────────────────────────

export default function DashboardClient({ data }: Props) {
    if (!data) {
        return (
            <div className="flex flex-col items-center justify-center h-64 gap-3">
                <RefreshCw size={32} className="text-gray-300" />
                <p className="text-gray-500 text-sm">Could not load financial data.</p>
                <button
                    onClick={() => window.location.reload()}
                    className="text-xs text-leads-blue hover:underline"
                >
                    Retry
                </button>
            </div>
        );
    }

    const { cashPosition, monthlyInflow, monthlyOutflow, netCashFlow,
        outflowByCategory, recentTransactions, feeAging, period, generatedAt } = data;

    const isPositive = netCashFlow >= 0;

    return (
        <div className="space-y-6 max-w-[1400px]">

            {/* ── Page header ──────────────────────────────────────────────── */}
            <motion.div {...fadeUp(0)} className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <div className="p-1.5 bg-leads-blue/10 rounded-lg">
                            <LayoutGrid size={16} className="text-leads-blue" />
                        </div>
                        <span className="text-xs font-semibold text-leads-blue uppercase tracking-widest">
                            Finance Overview
                        </span>
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
                        {period.month} {period.year}
                    </h1>
                    <p className="text-sm text-gray-400 mt-0.5">
                        Updated {new Date(generatedAt).toLocaleString('en-PK', { timeStyle: 'short', dateStyle: 'medium' })}
                    </p>
                </div>
                <a
                    href="/finance/cash-bank"
                    className="flex items-center gap-2 text-sm font-semibold text-white bg-leads-blue hover:bg-leads-blue/90 transition-colors px-4 py-2 rounded-xl shadow-sm"
                >
                    <ArrowRightLeft size={15} />
                    All Transactions
                </a>
            </motion.div>

            {/* ── KPI Cards ─────────────────────────────────────────────────── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <KpiCard
                    label="Total Liquid Assets"
                    value={`PKR ${formatPKR(cashPosition.totalLiquidAssets)}`}
                    sub={`Across ${cashPosition.byType.reduce((s, g) => s + g.wallets.length, 0)} wallets`}
                    icon={Wallet}
                    accent="bg-indigo-50 text-indigo-600"
                    delay={0.08}
                />
                <KpiCard
                    label="Collected This Month"
                    value={`PKR ${formatPKR(monthlyInflow.total)}`}
                    sub={`${monthlyInflow.transactionCount} payments received`}
                    icon={TrendingUp}
                    accent="bg-emerald-50 text-emerald-600"
                    delay={0.13}
                />
                <KpiCard
                    label="Spent This Month"
                    value={`PKR ${formatPKR(monthlyOutflow.total)}`}
                    sub={`${monthlyOutflow.transactionCount} outgoing payments`}
                    icon={TrendingDown}
                    accent="bg-rose-50 text-rose-600"
                    delay={0.18}
                />
                <KpiCard
                    label="Net Cash Flow"
                    value={`${isPositive ? '+' : ''}PKR ${formatPKR(Math.abs(netCashFlow))}`}
                    sub={isPositive ? 'Surplus this month' : 'Deficit this month'}
                    icon={isPositive ? ArrowUpRight : ArrowDownRight}
                    accent={isPositive ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}
                    delay={0.23}
                />
            </div>

            {/* ── Middle Row: Cash Flow + Spending ─────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <CashFlowBars
                    inflow={monthlyInflow.total}
                    outflow={monthlyOutflow.total}
                    month={period.month}
                    year={period.year}
                />
                <SpendingBreakdown
                    categories={outflowByCategory}
                    totalOutflow={monthlyOutflow.total}
                />
            </div>

            {/* ── Bottom Row: Activity + Wallets + Aging ────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <ActivityFeed transactions={recentTransactions} />
                </div>
                <div className="flex flex-col gap-6">
                    <WalletBreakdown byType={cashPosition.byType} />
                    <FeeAgingPanel buckets={feeAging} />
                </div>
            </div>
        </div>
    );
}
