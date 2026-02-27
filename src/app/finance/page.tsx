/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * @file page.tsx
 * @description Executive Finance Dashboard — Chancellor's View
 *
 * Architecture (Next.js App Router pattern):
 *   FinanceDashboard (Server Component) — fetches data, passes to children
 *   └── KpiCards        (Client Component) — animated entry
 *   └── CashFlowChart   (Client Component) — pure CSS animated bars
 *   └── SpendingBreakdown (Client Component) — category breakdown bars
 *   └── ActivityFeed    (Client Component) — recent transaction list
 *   └── FeeAging        (Client Component) — aging buckets
 */

import { Suspense } from 'react';
import DashboardClient from './_components/DashboardClient';

// ─── Data Fetching (Server Component) ────────────────────────────────────────

interface AnalyticsData {
    cashPosition: { totalLiquidAssets: number; byType: Array<{ _id: string; total: number; wallets: any[] }> };
    monthlyInflow: { total: number; transactionCount: number };
    monthlyOutflow: { total: number; transactionCount: number };
    netCashFlow: number;
    outflowByCategory: Array<{ _id: string; categoryName: string; total: number; count: number }>;
    recentTransactions: Array<{ _id: string; amount: number; type: string; date: string; notes?: string; referenceType?: string; walletName: string; categoryName?: string }>;
    feeAging: Array<{ _id: string; amount: number; count: number }>;
    period: { month: string; year: number };
    generatedAt: string;
}

async function getAnalytics(): Promise<AnalyticsData | null> {
    try {
        // In Next.js App Router, absolute URL is required in server components
        const base = process.env.NEXTAUTH_URL || 'http://localhost:3000';
        const res = await fetch(`${base}/api/finance/analytics`, {
            cache: 'no-store', // always fresh for executive dashboard
        });
        if (!res.ok) return null;
        return res.json();
    } catch {
        return null;
    }
}

export default async function FinanceDashboard() {
    const data = await getAnalytics();

    return (
        <Suspense
            fallback={
                <div className="flex items-center justify-center h-64">
                    <div className="flex flex-col items-center gap-3">
                        <div className="w-10 h-10 border-4 border-leads-blue border-t-transparent rounded-full animate-spin" />
                        <p className="text-gray-500 text-sm">Loading financial data…</p>
                    </div>
                </div>
            }
        >
            <DashboardClient data={data} />
        </Suspense>
    );
}
