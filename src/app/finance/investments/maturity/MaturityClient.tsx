'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useMemo } from 'react';
import Link from 'next/link';
import {
    CalendarCheck2, FileWarning, CalendarClock, AlertCircle, ArrowUpRight
} from 'lucide-react';

function formatPKR(n: number) {
    return new Intl.NumberFormat('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n || 0);
}

export default function MaturityClient({ initialInvestments }: { initialInvestments: any[] }) {

    const {
        overdue,
        next30Days,
        next60Days,
        next90Days,
        longTerm,
        openEnded
    } = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const result = {
            overdue: [] as any[],
            next30Days: [] as any[],
            next60Days: [] as any[],
            next90Days: [] as any[],
            longTerm: [] as any[],
            openEnded: [] as any[]
        };

        initialInvestments.forEach(inv => {
            if (!inv.maturityDate) {
                result.openEnded.push(inv);
                return;
            }

            const matDate = new Date(inv.maturityDate);
            matDate.setHours(0, 0, 0, 0);

            const diffTime = matDate.getTime() - today.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays < 0) {
                result.overdue.push(inv);
            } else if (diffDays <= 30) {
                result.next30Days.push(inv);
            } else if (diffDays <= 60) {
                result.next60Days.push(inv);
            } else if (diffDays <= 90) {
                result.next90Days.push(inv);
            } else {
                result.longTerm.push(inv);
            }
        });

        return result;
    }, [initialInvestments]);

    // Reusable view block for a category
    const renderBucket = (title: string, data: any[], icon: any, colorClass: string, bgClass: string, borderClass: string) => {
        if (data.length === 0) return null;

        const Icon = icon;

        return (
            <div className={`rounded-2xl border ${borderClass} bg-white shadow-sm overflow-hidden mb-6`}>
                <div className={`px-5 py-4 flex items-center justify-between border-b border-gray-100 ${bgClass}`}>
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg bg-white shadow-sm ${colorClass}`}>
                            <Icon size={18} />
                        </div>
                        <h2 className="font-bold text-gray-900">{title}</h2>
                    </div>
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-white shadow-sm text-gray-700">
                        {data.length} Placements
                    </span>
                </div>

                <div className="divide-y divide-gray-50">
                    {data.map(inv => {
                        const expectedReturn = inv.expectedReturnAmount || inv.principalAmount;
                        return (
                            <div key={inv._id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-gray-50/50 transition-colors">
                                <div>
                                    <h3 className="font-bold text-gray-900 mb-1 leading-tight">{inv.name}</h3>
                                    <p className="text-xs text-gray-500 uppercase tracking-widest">{inv.investmentNumber} &bull; {inv.type.replace('_', ' ')}</p>
                                </div>

                                <div className="flex sm:flex-row flex-col sm:items-center gap-6">
                                    <div className="text-left sm:text-right">
                                        <p className="text-xs text-gray-400 mb-0.5">Maturity Date</p>
                                        <p className={`font-semibold ${diffColorClass(inv.maturityDate)}`}>
                                            {inv.maturityDate ? new Date(inv.maturityDate).toLocaleDateString('en-PK', { year: 'numeric', month: 'short', day: 'numeric' }) : 'Open-Ended'}
                                        </p>
                                    </div>
                                    <div className="text-left sm:text-right">
                                        <p className="text-xs text-gray-400 mb-0.5">Expected Payoff</p>
                                        <p className="font-bold font-mono text-gray-900">PKR {formatPKR(expectedReturn)}</p>
                                    </div>

                                    <Link
                                        href={`/finance/investments/returns?walletId=${inv.sourceWalletId?._id}`}
                                        className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-lg transition-colors border border-gray-200/50"
                                    >
                                        Record Return <ArrowUpRight size={14} />
                                    </Link>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    const diffColorClass = (d?: string) => {
        if (!d) return 'text-gray-500';
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const mat = new Date(d); mat.setHours(0, 0, 0, 0);

        const diffDays = Math.ceil((mat.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays < 0) return 'text-rose-600 font-bold';
        if (diffDays <= 15) return 'text-orange-600 font-bold';
        if (diffDays <= 30) return 'text-yellow-600 font-bold';
        return 'text-gray-700';
    };

    return (
        <div className="space-y-6">

            {/* Health Strip */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4 flex flex-col items-center justify-center text-center">
                    <p className="text-xs font-semibold text-rose-600 uppercase tracking-widest mb-1">Overdue</p>
                    <p className="text-3xl font-bold text-rose-700">{overdue.length}</p>
                </div>
                <div className="bg-orange-50 border border-orange-100 rounded-2xl p-4 flex flex-col items-center justify-center text-center">
                    <p className="text-xs font-semibold text-orange-600 uppercase tracking-widest mb-1">Due ≤ 30 Days</p>
                    <p className="text-3xl font-bold text-orange-700">{next30Days.length}</p>
                </div>
                <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex flex-col items-center justify-center text-center">
                    <p className="text-xs font-semibold text-leads-blue uppercase tracking-widest mb-1">Due ≤ 60 Days</p>
                    <p className="text-3xl font-bold text-leads-blue">{next60Days.length}</p>
                </div>
                <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 flex flex-col items-center justify-center text-center">
                    <p className="text-xs font-semibold text-emerald-600 uppercase tracking-widest mb-1">Total Active</p>
                    <p className="text-3xl font-bold text-emerald-700">{initialInvestments.length}</p>
                </div>
            </div>

            {initialInvestments.length === 0 && (
                <div className="bg-white border text-center border-gray-100 rounded-2xl p-12 shadow-sm">
                    <CalendarCheck2 size={48} className="text-gray-200 mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-gray-900 mb-1">No Active Investments</h3>
                    <p className="text-sm text-gray-500">There are no active deposits or investments requiring maturity tracking.</p>
                </div>
            )}

            {renderBucket("Overdue for Return", overdue, AlertCircle, "text-rose-600", "bg-rose-50/50", "border-rose-100 shadow-rose-100/20")}
            {renderBucket("Maturing within 30 Days", next30Days, FileWarning, "text-orange-500", "bg-orange-50/30", "border-orange-100/50")}
            {renderBucket("Maturing within 60 Days", next60Days, CalendarClock, "text-yellow-600", "bg-yellow-50/30", "border-yellow-100/50")}
            {renderBucket("Maturing within 90 Days", next90Days, CalendarClock, "text-leads-blue", "bg-blue-50/30", "border-gray-100")}
            {renderBucket("Long Term (> 90 Days)", longTerm, CalendarCheck2, "text-emerald-600", "bg-emerald-50/30", "border-gray-100")}
            {renderBucket("Open-Ended Investments", openEnded, CalendarCheck2, "text-gray-400", "bg-gray-50/50", "border-gray-100")}

        </div>
    );
}
