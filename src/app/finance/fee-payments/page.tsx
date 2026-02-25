'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Wallet, Search, Loader2, Receipt } from 'lucide-react';

interface Payment {
    _id: string;
    receiptNumber: string;
    feeInvoice: { invoiceNumber: string; studentName: string; rollNumber: string; totalAmount: number };
    amount: number;
    paymentMode: string;
    paymentDate: string;
    receivedBy: string;
    isReversal: boolean;
}

const modeColors: Record<string, string> = {
    CASH: 'bg-green-100 text-green-700',
    BANK_TRANSFER: 'bg-blue-100 text-blue-700',
    CHEQUE: 'bg-yellow-100 text-yellow-700',
    ONLINE: 'bg-purple-100 text-purple-700',
    DD: 'bg-orange-100 text-orange-700',
};

export default function FeePaymentsPage() {
    const [payments, setPayments] = useState<Payment[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    useEffect(() => {
        fetch('/api/finance/fee-payments')
            .then(r => r.json()).then(d => setPayments(Array.isArray(d) ? d : []))
            .finally(() => setLoading(false));
    }, []);

    const filtered = payments.filter(p => {
        const q = search.toLowerCase();
        return !q
            || p.receiptNumber?.toLowerCase().includes(q)
            || p.feeInvoice?.studentName?.toLowerCase().includes(q)
            || p.feeInvoice?.rollNumber?.toLowerCase().includes(q)
            || p.feeInvoice?.invoiceNumber?.toLowerCase().includes(q);
    });

    const total = filtered.reduce((s, p) => s + p.amount, 0);

    return (
        <div className="space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h1 className="text-xl font-bold text-leads-blue flex items-center gap-2"><Wallet size={22} /> Fee Payments</h1>
                    <p className="text-xs text-gray-500 mt-0.5">Payment receipts · {payments.length} records</p>
                </div>
                <div className="bg-white border border-gray-200 rounded-xl px-4 py-2 text-sm text-gray-700">
                    Total Collected: <span className="font-bold text-green-700">PKR {total.toLocaleString('en-PK')}</span>
                </div>
            </div>

            <div className="flex gap-3">
                <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 text-gray-400" size={15} />
                    <input type="text" placeholder="Search receipt, student, roll #..." value={search} onChange={e => setSearch(e.target.value)}
                        className="pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-sm w-72 focus:outline-none focus:ring-1 focus:ring-leads-blue" />
                </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 border-b border-gray-100 text-xs uppercase text-gray-500 font-semibold">
                            <tr>
                                <th className="px-4 py-3">Receipt #</th>
                                <th className="px-4 py-3">Student</th>
                                <th className="px-4 py-3">Invoice #</th>
                                <th className="px-4 py-3">Mode</th>
                                <th className="px-4 py-3 text-right">Amount (PKR)</th>
                                <th className="px-4 py-3">Date</th>
                                <th className="px-4 py-3">Received By</th>
                                <th className="px-4 py-3 text-center">Type</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {loading ? (
                                <tr><td colSpan={8} className="py-12 text-center"><Loader2 className="animate-spin mx-auto text-gray-400" size={22} /></td></tr>
                            ) : filtered.length === 0 ? (
                                <tr><td colSpan={8} className="py-10 text-center text-gray-400 text-sm">
                                    <Receipt size={36} className="mx-auto mb-2 opacity-30" />
                                    {search ? 'No matching payments.' : 'No payments recorded yet. Process a fee payment from the Fee Invoices page.'}
                                </td></tr>
                            ) : (
                                filtered.map((p, i) => (
                                    <motion.tr key={p._id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}
                                        className={`hover:bg-blue-50/20 transition-colors ${p.isReversal ? 'bg-red-50/30' : ''}`}>
                                        <td className="px-4 py-3 font-mono text-xs font-semibold text-leads-blue">{p.receiptNumber}</td>
                                        <td className="px-4 py-3">
                                            <p className="text-sm font-medium text-gray-800">{p.feeInvoice?.studentName}</p>
                                            <p className="text-xs text-gray-400">{p.feeInvoice?.rollNumber}</p>
                                        </td>
                                        <td className="px-4 py-3 text-xs font-mono text-gray-600">{p.feeInvoice?.invoiceNumber}</td>
                                        <td className="px-4 py-3">
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${modeColors[p.paymentMode] || 'bg-gray-100 text-gray-600'}`}>
                                                {p.paymentMode?.replace(/_/g, ' ')}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right font-mono font-semibold text-green-700">
                                            {p.amount.toLocaleString('en-PK', { minimumFractionDigits: 2 })}
                                        </td>
                                        <td className="px-4 py-3 text-xs text-gray-500">{new Date(p.paymentDate).toLocaleDateString('en-PK')}</td>
                                        <td className="px-4 py-3 text-xs text-gray-500">{p.receivedBy}</td>
                                        <td className="px-4 py-3 text-center">
                                            {p.isReversal
                                                ? <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">REVERSAL</span>
                                                : <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">PAYMENT</span>}
                                        </td>
                                    </motion.tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
