'use client';

import { useState, useEffect } from 'react';
import { Users, Calendar, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

function formatPKR(n: number) {
    return new Intl.NumberFormat('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
}

export default function SalaryReportClient() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [timeframe, setTimeframe] = useState<'year' | 'month' | 'all'>('year');

    const fetchReport = async (tf: 'year' | 'month' | 'all') => {
        setLoading(true);
        try {
            const res = await fetch(`/api/finance/reports/salary?timeframe=${tf}`);
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
                <Loader2 className="animate-spin text-indigo-500" size={32} />
            </div>
        );
    }

    const maxAmount = data.statsByDepartment.reduce((max: number, item: any) => item.totalAmount > max ? item.totalAmount : max, 0);

    return (
        <div className="space-y-6 max-w-[1100px] flex flex-col min-h-full">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <span className="text-xs font-semibold text-indigo-600 uppercase tracking-widest">HR & Payroll</span>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight mt-0.5">Salary Summary Report</h1>
                    <p className="text-sm text-gray-400">Total payroll expenditure by department</p>
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
                            <Loader2 className="animate-spin text-indigo-500" size={30} />
                        </div>
                    )}

                    <h2 className="font-semibold text-gray-900 flex items-center gap-2 mb-6">
                        <Users size={16} className="text-indigo-500" />
                        Salary Distribution by Department
                    </h2>

                    {data.statsByDepartment.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-[250px] text-gray-400">
                            <Users size={32} className="mb-2 opacity-50" />
                            <p>No payroll data found for this period</p>
                        </div>
                    ) : (
                        <div className="space-y-5">
                            {data.statsByDepartment.map((stat: any, index: number) => {
                                const percentage = maxAmount > 0 ? (stat.totalAmount / maxAmount) * 100 : 0;
                                const isTop = index === 0;

                                return (
                                    <div key={stat.department} className="group">
                                        <div className="flex justify-between items-end mb-1.5">
                                            <span className="text-sm font-medium text-gray-700">{stat.department}</span>
                                            <div className="text-right">
                                                <span className="text-sm font-bold text-gray-900">PKR {formatPKR(stat.totalAmount)}</span>
                                                <span className="text-xs text-gray-400 ml-2">({stat.count} slips)</span>
                                            </div>
                                        </div>
                                        <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: `${percentage}%` }}
                                                transition={{ duration: 0.8, ease: "easeOut", delay: index * 0.1 }}
                                                className={`h-full rounded-full ${isTop ? 'bg-indigo-500' : 'bg-indigo-400'}`}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                <div className="space-y-6">
                    <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-6 flex flex-col justify-center min-h-[160px]">
                        <p className="text-sm font-semibold text-indigo-600 uppercase tracking-widest mb-1">Total Payroll</p>
                        <p className="text-xs text-indigo-500 mb-2">For selected {timeframe}</p>
                        <p className="text-4xl font-black text-indigo-700">PKR {formatPKR(data.totalSalary)}</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
