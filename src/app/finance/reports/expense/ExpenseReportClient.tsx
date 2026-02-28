'use client';

import { useState, useEffect } from 'react';
import { BarChart3, TrendingDown, Calendar, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

function formatPKR(n: number) {
    return new Intl.NumberFormat('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
}

export default function ExpenseReportsClient() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [timeframe, setTimeframe] = useState<'year' | 'month' | 'all'>('year');

    const fetchReport = async (tf: 'year' | 'month' | 'all') => {
        setLoading(true);
        try {
            const res = await fetch(`/api/finance/reports/expense?timeframe=${tf}`);
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
                <Loader2 className="animate-spin text-leads-blue" size={32} />
            </div>
        );
    }

    const maxAmount = data.statsByCategory.reduce((max: number, item: any) => item.totalAmount > max ? item.totalAmount : max, 0);

    return (
        <div className="space-y-6 max-w-[1100px] flex flex-col min-h-full">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <span className="text-xs font-semibold text-leads-blue uppercase tracking-widest">Money Out</span>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight mt-0.5">Expense Reports</h1>
                    <p className="text-sm text-gray-400">Total expenditure mapped by category</p>
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
                            <Loader2 className="animate-spin text-leads-blue" size={30} />
                        </div>
                    )}

                    <h2 className="font-semibold text-gray-900 flex items-center gap-2 mb-6">
                        <BarChart3 size={16} className="text-leads-blue" />
                        Spending by Category
                    </h2>

                    {data.statsByCategory.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-[250px] text-gray-400">
                            <TrendingDown size={32} className="mb-2 opacity-50" />
                            <p>No expenses found for this period</p>
                        </div>
                    ) : (
                        <div className="space-y-5">
                            {data.statsByCategory.map((stat: any, index: number) => {
                                const percentage = maxAmount > 0 ? (stat.totalAmount / maxAmount) * 100 : 0;
                                const isTop = index === 0;

                                return (
                                    <div key={stat._id} className="group">
                                        <div className="flex justify-between items-end mb-1.5">
                                            <span className="text-sm font-medium text-gray-700">{stat.categoryName}</span>
                                            <div className="text-right">
                                                <span className="text-sm font-bold text-gray-900">PKR {formatPKR(stat.totalAmount)}</span>
                                                <span className="text-xs text-gray-400 ml-2">({stat.count} items)</span>
                                            </div>
                                        </div>
                                        <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: `${percentage}%` }}
                                                transition={{ duration: 0.8, ease: "easeOut", delay: index * 0.1 }}
                                                className={`h-full rounded-full ${isTop ? 'bg-rose-500' : 'bg-leads-blue'}`}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                <div className="space-y-6">
                    <div className="bg-rose-50 border border-rose-100 rounded-2xl p-6 flex flex-col justify-center min-h-[160px]">
                        <p className="text-sm font-semibold text-rose-500 uppercase tracking-widest mb-1">Total Spending</p>
                        <p className="text-xs text-rose-400 mb-2">For selected {timeframe}</p>
                        <p className="text-4xl font-black text-rose-700">PKR {formatPKR(data.totalExpense)}</p>
                    </div>

                    <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
                        <h3 className="font-semibold text-gray-900 text-sm mb-4">Top Spending Categories</h3>
                        <div className="space-y-4">
                            {data.statsByCategory.slice(0, 3).map((stat: any, i: number) => (
                                <div key={stat._id} className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-6 h-6 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center text-xs font-bold font-mono">
                                            {i + 1}
                                        </div>
                                        <span className="text-sm font-medium text-gray-700">{stat.categoryName}</span>
                                    </div>
                                    <span className="text-sm font-semibold text-gray-900">{((stat.totalAmount / data.totalExpense) * 100).toFixed(0)}%</span>
                                </div>
                            ))}
                            {data.statsByCategory.length === 0 && (
                                <p className="text-sm text-gray-400 text-center py-4">No data</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
