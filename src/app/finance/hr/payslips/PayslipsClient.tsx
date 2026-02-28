'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState } from 'react';
import { Search, FileText, Download, Calendar } from 'lucide-react';

export default function PayslipsClient({ initialSlips }: { initialSlips: any[] }) {
    const [slips] = useState<any[]>(initialSlips);
    const [search, setSearch] = useState('');

    // Unique months/years for filtering could be added here
    const [filterMonth, setFilterMonth] = useState<string>('ALL');
    const [filterYear, setFilterYear] = useState<string>('ALL');

    const filtered = slips.filter(s => {
        const matchesSearch =
            s.staffId?.name?.toLowerCase().includes(search.toLowerCase()) ||
            s.staffId?.department?.toLowerCase().includes(search.toLowerCase());

        const matchesMonth = filterMonth === 'ALL' || s.month.toString() === filterMonth;
        const matchesYear = filterYear === 'ALL' || s.year.toString() === filterYear;

        return matchesSearch && matchesMonth && matchesYear;
    });

    const uniqueYears = Array.from(new Set(slips.map(s => s.year))).sort((a, b) => b - a);

    // Simple print handler
    const handlePrint = (slip: any) => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const html = `
            <html>
            <head>
                <title>Salary Slip - ${slip.staffId?.name}</title>
                <style>
                    body { font-family: sans-serif; padding: 40px; color: #333; }
                    .header { border-bottom: 2px solid #ddd; padding-bottom: 20px; margin-bottom: 30px; }
                    .title { font-size: 24px; font-weight: bold; margin: 0; color: #1e3a8a; }
                    .subtitle { font-size: 14px; color: #666; margin-top: 5px; }
                    .grid { display: flex; justify-content: space-between; margin-bottom: 30px; }
                    .section { width: 48%; }
                    .row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
                    .row-bold { font-weight: bold; font-size: 18px; border-top: 2px solid #ddd; padding-top: 15px; margin-top: 10px; }
                    .text-green { color: #16a34a; }
                    .text-red { color: #dc2626; }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1 class="title">Lahore Leads University</h1>
                    <p class="subtitle">Salary Slip for ${new Date(slip.year, slip.month - 1).toLocaleString('default', { month: 'long' })} ${slip.year}</p>
                </div>
                
                <div class="grid">
                    <div class="section">
                        <strong>Employee Details</strong><br/><br/>
                        Name: ${slip.staffId?.name}<br/>
                        Department: ${slip.staffId?.department}<br/>
                        Role: ${slip.staffId?.role}<br/>
                        CNIC: ${slip.staffId?.cnic || 'N/A'}<br/>
                    </div>
                    <div class="section">
                        <strong>Payment Details</strong><br/><br/>
                        Status: ${slip.status}<br/>
                        Paid Date: ${slip.paidDate ? new Date(slip.paidDate).toLocaleDateString() : 'N/A'}<br/>
                        Slip ID: ${slip._id}<br/>
                        Payment Ref: ${slip.transactionId || 'N/A'}<br/>
                    </div>
                </div>

                <h3>Earnings & Deductions</h3>
                <div style="border: 1px solid #ddd; padding: 20px; border-radius: 8px;">
                    <div class="row">
                        <span>Base Amount</span>
                        <span>PKR ${slip.baseAmount?.toLocaleString() || 0}</span>
                    </div>
                    <div class="row text-green">
                        <span>Total Allowances</span>
                        <span>+ PKR ${slip.allowances?.toLocaleString() || 0}</span>
                    </div>
                    <div class="row text-red">
                        <span>Total Deductions</span>
                        <span>- PKR ${slip.deductions?.toLocaleString() || 0}</span>
                    </div>
                    <div class="row row-bold">
                        <span>Net Payable</span>
                        <span>PKR ${slip.netPayable?.toLocaleString() || 0}</span>
                    </div>
                </div>

                <div style="margin-top: 50px; text-align: center; color: #888; font-size: 12px;">
                    This is a computer-generated document. No signature is required.
                </div>
            </body>
            </html>
        `;

        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
            printWindow.print();
        }, 500);
    };

    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-4 sm:p-6 border-b border-gray-100 flex flex-col sm:flex-row gap-4 justify-between bg-gray-50">
                <div className="flex flex-col sm:flex-row items-center gap-4 flex-1">
                    <div className="relative w-full sm:w-80">
                        <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
                        <input type="text" placeholder="Search by name or department..." value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm w-full focus:outline-none focus:ring-2 focus:ring-leads-blue"
                        />
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <Calendar size={16} className="text-gray-400" />
                        <select className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
                            value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)}>
                            <option value="ALL">All Months</option>
                            {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                                <option key={m} value={m}>{new Date(2000, m - 1).toLocaleString('default', { month: 'short' })}</option>
                            ))}
                        </select>
                        <select className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
                            value={filterYear} onChange={(e) => setFilterYear(e.target.value)}>
                            <option value="ALL">All Years</option>
                            {uniqueYears.map((y: any) => <option key={y} value={y}>{y}</option>)}
                        </select>
                    </div>
                </div>
                <div className="text-sm text-gray-500 flex items-center">
                    Showing {filtered.length} slips
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-white border-b border-gray-100 text-gray-500 text-xs font-semibold uppercase tracking-wider">
                        <tr>
                            <th className="px-6 py-4">Period</th>
                            <th className="px-6 py-4">Staff Member</th>
                            <th className="px-6 py-4 text-right">Base / Gross</th>
                            <th className="px-6 py-4 text-right">Net Paid</th>
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 bg-white">
                        {filtered.length === 0 ? (
                            <tr><td colSpan={6} className="py-16 text-center text-gray-400">
                                <FileText className="mx-auto mb-2 text-gray-200" size={32} />
                                No salary slips found matching your filters.
                            </td></tr>
                        ) : filtered.map((slip) => (
                            <tr key={slip._id} className="hover:bg-gray-50/50 transition-colors">
                                <td className="px-6 py-4">
                                    <p className="font-semibold text-gray-900">{new Date(slip.year, slip.month - 1).toLocaleString('default', { month: 'short' })} {slip.year}</p>
                                    <p className="text-xs text-gray-400">{new Date(slip.createdAt).toLocaleDateString()}</p>
                                </td>
                                <td className="px-6 py-4">
                                    <p className="font-semibold text-gray-900">{slip.staffId?.name || 'Unknown'}</p>
                                    <p className="text-xs text-gray-400">{slip.staffId?.department} • {slip.staffId?.role}</p>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <p className="font-mono text-gray-600">PKR {slip.baseAmount?.toLocaleString()}</p>
                                    <div className="flex gap-2 justify-end text-xs text-gray-400 font-mono mt-0.5">
                                        <span className="text-emerald-600">+{slip.allowances?.toLocaleString()}</span>
                                        <span className="text-rose-600">-{slip.deductions?.toLocaleString()}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-right font-mono font-bold text-gray-900">
                                    PKR {slip.netPayable?.toLocaleString()}
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`text-xs px-2.5 py-1 rounded-full font-semibold border ${slip.status === 'PAID' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-amber-50 text-amber-700 border-amber-100'}`}>
                                        {slip.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <button onClick={() => handlePrint(slip)} className="p-2 text-gray-500 hover:text-leads-blue hover:bg-blue-50 rounded-lg transition-colors inline-flex">
                                        <Download size={18} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
