'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { BarChart2, RefreshCw, Loader2 } from 'lucide-react';

interface AgingRow {
    studentId: string; studentName: string; rollNumber: string; invoiceNumber: string;
    current: number; days30: number; days60: number; days90: number; over90: number;
    totalOutstanding: number;
}

interface AgingData { rows: AgingRow[]; totals: { current: number; days30: number; days60: number; days90: number; over90: number; grand: number }; generatedAt: string; }

export default function AgingReportPage() {
    const [data, setData] = useState<AgingData | null>(null);
    const [loading, setLoading] = useState(false);

    const load = () => {
        setLoading(true);
        fetch('/api/finance/fee-invoices?status=UNPAID&status=PARTIAL&status=OVERDUE&_limit=500')
            .then(r => r.json())
            .then((d: { invoices?: any[] }) => {
                const invoices = d.invoices || [];
                const today = new Date();

                const rows: AgingRow[] = invoices.map((inv: any) => {
                    const due = new Date(inv.dueDate);
                    const daysPast = Math.max(0, Math.floor((today.getTime() - due.getTime()) / 86400000));
                    const out = inv.outstandingAmount || 0;

                    return {
                        studentId: inv.studentId,
                        studentName: inv.studentName,
                        rollNumber: inv.rollNumber,
                        invoiceNumber: inv.invoiceNumber,
                        current: daysPast === 0 ? out : 0,
                        days30: daysPast > 0 && daysPast <= 30 ? out : 0,
                        days60: daysPast > 30 && daysPast <= 60 ? out : 0,
                        days90: daysPast > 60 && daysPast <= 90 ? out : 0,
                        over90: daysPast > 90 ? out : 0,
                        totalOutstanding: out,
                    };
                });

                const totals = rows.reduce((acc, r) => ({
                    current: acc.current + r.current,
                    days30: acc.days30 + r.days30,
                    days60: acc.days60 + r.days60,
                    days90: acc.days90 + r.days90,
                    over90: acc.over90 + r.over90,
                    grand: acc.grand + r.totalOutstanding,
                }), { current: 0, days30: 0, days60: 0, days90: 0, over90: 0, grand: 0 });

                setData({ rows, totals, generatedAt: new Date().toISOString() });
            })
            .finally(() => setLoading(false));
    };

    const fmt = (n: number) => n > 0 ? n.toLocaleString('en-PK', { minimumFractionDigits: 0 }) : '—';

    return (
        <div className="space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h1 className="text-xl font-bold text-leads-blue flex items-center gap-2"><BarChart2 size={22} /> Fee Aging Report</h1>
                    <p className="text-xs text-gray-500 mt-0.5">Outstanding receivables by aging bucket (Current / 1–30 / 31–60 / 61–90 / 90+ days)</p>
                </div>
                <button onClick={load} disabled={loading}
                    className="flex items-center gap-2 bg-leads-blue text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-800">
                    {loading ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />} Generate Report
                </button>
            </div>

            {data && (
                <>
                    {/* Summary cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                        {[
                            { label: 'Current', value: data.totals.current, cls: 'text-green-700 bg-green-50' },
                            { label: '1–30 Days', value: data.totals.days30, cls: 'text-yellow-700 bg-yellow-50' },
                            { label: '31–60 Days', value: data.totals.days60, cls: 'text-orange-700 bg-orange-50' },
                            { label: '61–90 Days', value: data.totals.days90, cls: 'text-red-600 bg-red-50' },
                            { label: '90+ Days', value: data.totals.over90, cls: 'text-red-800 bg-red-100' },
                            { label: 'Grand Total', value: data.totals.grand, cls: 'text-leads-blue bg-blue-50 border border-leads-blue/20' },
                        ].map(s => (
                            <motion.div key={s.label} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                                className={`rounded-xl p-3 ${s.cls}`}>
                                <p className="text-[10px] font-semibold uppercase tracking-wider opacity-70">{s.label}</p>
                                <p className="text-sm font-bold mt-0.5">PKR {s.value.toLocaleString('en-PK', { minimumFractionDigits: 0 })}</p>
                            </motion.div>
                        ))}
                    </div>

                    {/* Aging Table */}
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                        className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs text-left">
                                <thead className="bg-gray-50 border-b border-gray-100 text-[10px] uppercase text-gray-500 font-semibold">
                                    <tr>
                                        <th className="px-4 py-3">Invoice #</th>
                                        <th className="px-4 py-3">Student</th>
                                        <th className="px-4 py-3">Roll #</th>
                                        <th className="px-4 py-3 text-right bg-green-50/50">Current</th>
                                        <th className="px-4 py-3 text-right bg-yellow-50/50">1–30 Days</th>
                                        <th className="px-4 py-3 text-right bg-orange-50/50">31–60 Days</th>
                                        <th className="px-4 py-3 text-right bg-red-50/50">61–90 Days</th>
                                        <th className="px-4 py-3 text-right bg-red-100/50">90+ Days</th>
                                        <th className="px-4 py-3 text-right font-bold">Total Outstanding</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {data.rows.length === 0 ? (
                                        <tr><td colSpan={9} className="py-10 text-center text-gray-400">No outstanding invoices — great!</td></tr>
                                    ) : data.rows.map((r, i) => (
                                        <tr key={i} className="hover:bg-blue-50/20 transition-colors">
                                            <td className="px-4 py-2 font-mono font-semibold text-leads-blue">{r.invoiceNumber}</td>
                                            <td className="px-4 py-2 font-medium text-gray-800">{r.studentName}</td>
                                            <td className="px-4 py-2 text-gray-500">{r.rollNumber}</td>
                                            <td className="px-4 py-2 text-right text-green-700">{fmt(r.current)}</td>
                                            <td className="px-4 py-2 text-right text-yellow-700">{fmt(r.days30)}</td>
                                            <td className="px-4 py-2 text-right text-orange-700">{fmt(r.days60)}</td>
                                            <td className="px-4 py-2 text-right text-red-600">{fmt(r.days90)}</td>
                                            <td className="px-4 py-2 text-right text-red-800 font-semibold">{fmt(r.over90)}</td>
                                            <td className="px-4 py-2 text-right font-bold text-gray-900">{r.totalOutstanding.toLocaleString('en-PK')}</td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot className="bg-leads-blue text-white text-xs font-bold">
                                    <tr>
                                        <td colSpan={3} className="px-4 py-2.5">TOTAL ({data.rows.length} invoices)</td>
                                        <td className="px-4 py-2.5 text-right font-mono">{fmt(data.totals.current)}</td>
                                        <td className="px-4 py-2.5 text-right font-mono">{fmt(data.totals.days30)}</td>
                                        <td className="px-4 py-2.5 text-right font-mono">{fmt(data.totals.days60)}</td>
                                        <td className="px-4 py-2.5 text-right font-mono">{fmt(data.totals.days90)}</td>
                                        <td className="px-4 py-2.5 text-right font-mono">{fmt(data.totals.over90)}</td>
                                        <td className="px-4 py-2.5 text-right font-mono">{data.totals.grand.toLocaleString('en-PK')}</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                        <div className="px-4 py-2 bg-gray-50 text-[10px] text-gray-400 border-t border-gray-100">Generated: {new Date(data.generatedAt).toLocaleString('en-PK')}</div>
                    </motion.div>
                </>
            )}

            {!data && !loading && (
                <div className="bg-white rounded-xl border border-gray-200 py-16 text-center text-gray-400">
                    <BarChart2 size={40} className="mx-auto mb-3 opacity-30" />
                    <p className="text-sm">Click Generate Report to see outstanding receivables by aging bucket.</p>
                </div>
            )}
        </div>
    );
}
