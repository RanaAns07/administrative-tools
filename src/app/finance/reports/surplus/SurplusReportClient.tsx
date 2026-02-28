'use client';

import { useState, useEffect } from 'react';
import { Receipt, Calendar, Loader2, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { motion } from 'framer-motion';

function formatPKR(n: number) {
    return new Intl.NumberFormat('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Math.abs(n));
}

export default function SurplusReportClient() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [timeframe, setTimeframe] = useState<'year' | 'month' | 'all'>('year');

    const fetchReport = async (tf: 'year' | 'month' | 'all') => {
        setLoading(true);
        try {
            const res = await fetch(`/api/finance/reports/surplus?timeframe=${tf}`);
            const json = await res.json();
            if (res.ok) setData(json);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReport(timeframe);
    }, []);

    const handleFilterChange = (tf: 'year' | 'month' | 'all') => {
        setTimeframe(tf);
        fetchReport(tf);
    };

    if (!data) {
        return (
            <div className="flex justify-center items-center min-h-[400px]">
                <Loader2 className="animate-spin text-purple-500" size={32} />
            </div>
        );
    }

    const { statsByPeriod, totalRevenue, totalExpense, netSurplus } = data;
    const isSurplusOverall = netSurplus >= 0;

    const maxAbsAmount = statsByPeriod.reduce((max: number, item: any) => {
        const rowMax = Math.max(item.revenue, item.expense);
        return rowMax > max ? rowMax : max;
    }, 0);

    return (
        <div className="space-y-6 max-w-[1100px] flex flex-col min-h-full">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <span className="text-xs font-semibold text-purple-600 uppercase tracking-widest">Net Position</span>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight mt-0.5">Surplus / Deficit Report</h1>
                    <p className="text-sm text-gray-400">Operational revenue vs operational expenses</p>
                </div>

                <div className="flex bg-white rounded-xl border border-gray-200 p-1 shadow-sm w-fit">
                    <button
                        onClick={() => handleFilterChange('month')}
                        className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${timeframe === 'month' ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        <Calendar size={14} /> Last 30 Days
                    </button>
                    <button
                        onClick={() => handleFilterChange('year')}
                        className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${timeframe === 'year' ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        <Calendar size={14} /> Last 12 Months
                    </button>
                    <button
                        onClick={() => handleFilterChange('all')}
                        className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${timeframe === 'all' ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        <Calendar size={14} /> All Time
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 bg-white border border-gray-100 rounded-2xl p-6 shadow-sm relative min-h-[400px]">
                    {loading && (
                        <div className="absolute inset-0 bg-white/70 backdrop-blur-sm z-10 flex items-center justify-center rounded-2xl">
                            <Loader2 className="animate-spin text-purple-500" size={30} />
                        </div>
                    )}

                    <h2 className="font-semibold text-gray-900 flex items-center gap-2 mb-6">
                        <Receipt size={16} className="text-purple-500" />
                        Income vs Expense by Period
                    </h2>

                    {statsByPeriod.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-[250px] text-gray-400">
                            <Receipt size={32} className="mb-2 opacity-50" />
                            <p>No operational data found for this period</p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {statsByPeriod.map((stat: any, index: number) => {
                                const revPct = maxAbsAmount > 0 ? (stat.revenue / maxAbsAmount) * 100 : 0;
                                const expPct = maxAbsAmount > 0 ? (stat.expense / maxAbsAmount) * 100 : 0;
                                const isSurplus = stat.surplus >= 0;

                                return (
                                    <div key={stat._id} className="group border-b border-gray-50 pb-4 last:border-0 last:pb-0">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-sm font-bold text-gray-700">{stat._id}</span>
                                            <div className="text-right">
                                                <span className={`text-sm font-bold flex items-center gap-1 ${isSurplus ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                    {isSurplus ? '+' : '-'} PKR {formatPKR(stat.surplus)}
                                                    {isSurplus ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="space-y-1.5">
                                            <div className="flex items-center gap-3">
                                                <div className="w-16 text-xs text-gray-500">Revenue</div>
                                                <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                                                    <motion.div
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${revPct}%` }}
                                                        transition={{ duration: 0.8, ease: "easeOut", delay: index * 0.1 }}
                                                        className="h-full rounded-full bg-emerald-400"
                                                    />
                                                </div>
                                                <div className="w-24 text-right text-xs font-semibold text-gray-700">PKR {formatPKR(stat.revenue)}</div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <div className="w-16 text-xs text-gray-500">Expense</div>
                                                <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                                                    <motion.div
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${expPct}%` }}
                                                        transition={{ duration: 0.8, ease: "easeOut", delay: index * 0.1 }}
                                                        className="h-full rounded-full bg-rose-400"
                                                    />
                                                </div>
                                                <div className="w-24 text-right text-xs font-semibold text-gray-700">PKR {formatPKR(stat.expense)}</div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                <div className="space-y-6">
                    <div className={`border rounded-2xl p-6 flex flex-col justify-center min-h-[160px] ${isSurplusOverall ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100'}`}>
                        <p className={`text-sm font-semibold uppercase tracking-widest mb-1 ${isSurplusOverall ? 'text-emerald-600' : 'text-rose-600'}`}>
                            Net {isSurplusOverall ? 'Surplus' : 'Deficit'}
                        </p>
                        <p className={`text-xs mb-2 ${isSurplusOverall ? 'text-emerald-500' : 'text-rose-500'}`}>For selected {timeframe}</p>
                        <p className={`text-4xl font-black flex items-center gap-1 ${isSurplusOverall ? 'text-emerald-700' : 'text-rose-700'}`}>
                            {isSurplusOverall ? '+' : '-'} PKR {formatPKR(netSurplus)}
                        </p>
                    </div>

                    <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
                        <h3 className="font-semibold text-gray-900 text-sm mb-4">Summary Breakdown</h3>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center py-2 border-b border-gray-50">
                                <span className="text-sm font-medium text-gray-500">Total Revenue</span>
                                <span className="text-sm font-bold text-gray-900">PKR {formatPKR(totalRevenue)}</span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-gray-50">
                                <span className="text-sm font-medium text-gray-500">Total Expense</span>
                                <span className="text-sm font-bold text-gray-900">PKR {formatPKR(totalExpense)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
