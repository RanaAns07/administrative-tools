'use client';

import { useState, useEffect } from 'react';
import { FileSpreadsheet, Loader2, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';

function formatPKR(n: number) {
    return new Intl.NumberFormat('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
}

export default function DuesReportClient() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const fetchReport = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/finance/reports/dues`);
            const json = await res.json();
            if (res.ok) setData(json);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReport();
    }, []);

    if (!data) {
        return (
            <div className="flex justify-center items-center min-h-[400px]">
                <Loader2 className="animate-spin text-amber-500" size={32} />
            </div>
        );
    }

    const maxAmount = data.duesByBatch?.reduce((max: number, item: any) => item.totalOutstanding > max ? item.totalOutstanding : max, 0) || 0;

    return (
        <div className="space-y-6 max-w-[1100px] flex flex-col min-h-full">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <span className="text-xs font-semibold text-amber-600 uppercase tracking-widest">Receivables</span>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight mt-0.5">Outstanding Dues Report</h1>
                    <p className="text-sm text-gray-400">Aged receivables by academic batch</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 bg-white border border-gray-100 rounded-2xl p-6 shadow-sm relative min-h-[400px]">
                    {loading && (
                        <div className="absolute inset-0 bg-white/70 backdrop-blur-sm z-10 flex items-center justify-center rounded-2xl">
                            <Loader2 className="animate-spin text-amber-500" size={30} />
                        </div>
                    )}

                    <h2 className="font-semibold text-gray-900 flex items-center gap-2 mb-6">
                        <FileSpreadsheet size={16} className="text-amber-500" />
                        Dues by Batch (Top Highest)
                    </h2>

                    {!data.duesByBatch || data.duesByBatch.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-[250px] text-gray-400">
                            <AlertCircle size={32} className="mb-2 opacity-50" />
                            <p>No outstanding dues found.</p>
                        </div>
                    ) : (
                        <div className="space-y-5">
                            {data.duesByBatch.map((stat: any, index: number) => {
                                const percentage = maxAmount > 0 ? (stat.totalOutstanding / maxAmount) * 100 : 0;
                                const isTop = index === 0;

                                return (
                                    <div key={stat.batchId} className="group">
                                        <div className="flex justify-between items-end mb-1.5">
                                            <span className="text-sm font-medium text-gray-700">{stat.batchName}</span>
                                            <div className="text-right">
                                                <span className="text-sm font-bold text-gray-900">PKR {formatPKR(stat.totalOutstanding)}</span>
                                                <span className="text-xs text-gray-400 ml-2">({stat.invoiceCount} invoices)</span>
                                            </div>
                                        </div>
                                        <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: `${percentage}%` }}
                                                transition={{ duration: 0.8, ease: "easeOut", delay: index * 0.1 }}
                                                className={`h-full rounded-full ${isTop ? 'bg-amber-500' : 'bg-amber-400'}`}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                <div className="space-y-6">
                    <div className="bg-amber-50 border border-amber-100 rounded-2xl p-6 flex flex-col justify-center min-h-[160px]">
                        <p className="text-sm font-semibold text-amber-600 uppercase tracking-widest mb-1">Total Outstanding</p>
                        <p className="text-xs text-amber-500 mb-2">Across all programs and batches</p>
                        <p className="text-4xl font-black text-amber-700">PKR {formatPKR(data.totalDues)}</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
