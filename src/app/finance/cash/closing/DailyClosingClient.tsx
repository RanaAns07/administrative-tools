'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Printer, TrendingUp, TrendingDown, ArrowRightLeft, Calendar } from 'lucide-react';

function formatPKR(n: number) {
    return new Intl.NumberFormat('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

export default function DailyClosingClient({ selectedDate, wallets, transactions }: { selectedDate: string; wallets: any[]; transactions: any[] }) {
    const router = useRouter();
    const [date, setDate] = useState(selectedDate);

    useEffect(() => {
        if (date !== selectedDate) {
            router.push(`/finance/cash/closing?date=${date}`);
        }
    }, [date, selectedDate, router]);

    // Compute transactions summary
    const inflowTxns = transactions.filter(t => ['FEE_PAYMENT', 'SECURITY_DEPOSIT', 'INVESTMENT_RETURN', 'WALLET_TRANSFER_IN'].includes(t.txType));
    const outflowTxns = transactions.filter(t => ['EXPENSE_PAYMENT', 'PAYROLL_PAYMENT', 'REFUND', 'WALLET_TRANSFER_OUT', 'STUDENT_ADVANCE_DEDUCTION'].includes(t.txType));

    const totalInflow = inflowTxns.reduce((sum, t) => sum + t.amount, 0);
    const totalOutflow = outflowTxns.reduce((sum, t) => sum + t.amount, 0);
    const netCashFlow = totalInflow - totalOutflow;

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="space-y-6">
            {/* Control Bar - Hidden when printing */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white p-4 rounded-xl border border-gray-100 shadow-sm print:hidden">
                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <Calendar size={18} className="text-gray-400" />
                    <input
                        type="date"
                        value={date}
                        onChange={e => setDate(e.target.value)}
                        className="w-full sm:w-auto px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-leads-blue font-medium"
                    />
                </div>
                <button
                    onClick={handlePrint}
                    className="w-full sm:w-auto px-4 py-2 bg-leads-blue text-white rounded-lg text-sm font-semibold hover:bg-blue-800 transition-colors flex items-center justify-center gap-2"
                >
                    <Printer size={16} />
                    Print Closing Report
                </button>
            </div>

            {/* Printable Report Content */}
            <div className="print:block" id="printable-report">
                {/* Visual Header strictly for print */}
                <div className="hidden print:block mb-8 text-center border-b-2 border-gray-900 pb-4">
                    <h1 className="text-2xl font-bold uppercase tracking-wider">Lahore Leads University</h1>
                    <h2 className="text-xl font-semibold mt-1">Daily Finance Closing Report</h2>
                    <p className="text-sm mt-1">Date: {new Date(selectedDate).toLocaleDateString('en-PK', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </div>

                {/* Summary Matrix */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                    <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-5 print:bg-white print:border-gray-200">
                        <div className="flex items-center gap-2 mb-2 text-emerald-600 print:text-gray-700">
                            <TrendingUp size={18} />
                            <p className="text-sm font-semibold uppercase tracking-wider">Total Inflows</p>
                        </div>
                        <p className="text-2xl font-bold text-emerald-700 print:text-gray-900">PKR {formatPKR(totalInflow)}</p>
                        <p className="text-[11px] text-emerald-600/70 mt-1 print:text-gray-500">{inflowTxns.length} transactions</p>
                    </div>
                    <div className="bg-rose-50 border border-rose-100 rounded-2xl p-5 print:bg-white print:border-gray-200">
                        <div className="flex items-center gap-2 mb-2 text-rose-600 print:text-gray-700">
                            <TrendingDown size={18} />
                            <p className="text-sm font-semibold uppercase tracking-wider">Total Outflows</p>
                        </div>
                        <p className="text-2xl font-bold text-rose-700 print:text-gray-900">PKR {formatPKR(totalOutflow)}</p>
                        <p className="text-[11px] text-rose-600/70 mt-1 print:text-gray-500">{outflowTxns.length} transactions</p>
                    </div>
                    <div className={`${netCashFlow >= 0 ? 'bg-leads-blue/10 border-leads-blue/20' : 'bg-rose-50 border-rose-100'} rounded-2xl p-5 print:bg-white print:border-gray-200`}>
                        <div className={`flex items-center gap-2 mb-2 ${netCashFlow >= 0 ? 'text-leads-blue' : 'text-rose-600'} print:text-gray-700`}>
                            <ArrowRightLeft size={18} />
                            <p className="text-sm font-semibold uppercase tracking-wider">Net Cash Flow</p>
                        </div>
                        <p className={`text-2xl font-bold ${netCashFlow >= 0 ? 'text-leads-blue' : 'text-rose-700'} print:text-gray-900`}>
                            {netCashFlow >= 0 ? '+' : '−'} PKR {formatPKR(Math.abs(netCashFlow))}
                        </p>
                        <p className={`text-[11px] mt-1 ${netCashFlow >= 0 ? 'text-leads-blue/70' : 'text-rose-600/70'} print:text-gray-500`}>For selected date</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* End of Day Balances (Snapshot) */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="p-4 bg-gray-50 border-b border-gray-100 font-semibold text-gray-900 text-sm">
                            End of Day Balances
                        </div>
                        <div className="p-0">
                            <table className="w-full text-left text-sm">
                                <thead>
                                    <tr className="border-b border-gray-50 bg-white">
                                        <th className="px-4 py-3 font-semibold text-gray-500 w-1/2">Wallet / Account</th>
                                        <th className="px-4 py-3 font-semibold text-gray-500 text-right">Closing Balance</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {wallets.map(w => (
                                        <tr key={w._id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                                            <td className="px-4 py-3">
                                                <p className="font-medium text-gray-900">{w.name}</p>
                                                <p className="text-[10px] text-gray-400 uppercase">{w.type}</p>
                                            </td>
                                            <td className="px-4 py-3 text-right font-mono font-bold text-gray-900">
                                                PKR {formatPKR(w.currentBalance)}
                                            </td>
                                        </tr>
                                    ))}
                                    {/* Grand Total Row */}
                                    <tr className="bg-gray-50 border-t-2 border-gray-200 print:bg-gray-100">
                                        <td className="px-4 py-3 font-bold text-gray-900 text-right uppercase tracking-wider text-xs">Total Liquid Assets</td>
                                        <td className="px-4 py-3 text-right font-mono font-bold text-gray-900 text-base">
                                            PKR {formatPKR(wallets.reduce((s, w) => s + w.currentBalance, 0))}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Today's Transactions Log */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col h-[500px] print:h-auto">
                        <div className="p-4 bg-gray-50 border-b border-gray-100 font-semibold text-gray-900 text-sm flex justify-between items-center">
                            <span>Transaction Log</span>
                            <span className="text-xs bg-white border border-gray-200 px-2 py-0.5 rounded text-gray-500 font-medium">
                                {transactions.length} total
                            </span>
                        </div>
                        <div className="flex-1 overflow-y-auto p-0 custom-scrollbar print:overflow-visible">
                            {transactions.length === 0 ? (
                                <div className="p-8 text-center text-gray-500 italic text-sm">
                                    No transactions recorded on this date.
                                </div>
                            ) : (
                                <table className="w-full text-left text-sm">
                                    <thead className="sticky top-0 bg-white border-b border-gray-50 shadow-sm print:static print:shadow-none">
                                        <tr>
                                            <th className="px-4 py-3 font-semibold text-gray-500">Type / Notes</th>
                                            <th className="px-4 py-3 font-semibold text-gray-500">Wallet</th>
                                            <th className="px-4 py-3 font-semibold text-gray-500 text-right">Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {transactions.map(txn => {
                                            const isInflow = ['FEE_PAYMENT', 'SECURITY_DEPOSIT', 'INVESTMENT_RETURN', 'WALLET_TRANSFER_IN'].includes(txn.txType);
                                            return (
                                                <tr key={txn._id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                                                    <td className="px-4 py-2.5">
                                                        <p className="font-semibold text-gray-900 text-xs uppercase tracking-wider">
                                                            {txn.txType.replace(/_/g, ' ')}
                                                        </p>
                                                        <p className="text-[11px] text-gray-500 max-w-[200px] truncate" title={txn.notes}>
                                                            {txn.notes || 'No description'}
                                                        </p>
                                                    </td>
                                                    <td className="px-4 py-2.5">
                                                        <span className="text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-700">
                                                            {txn.walletId?.name || 'Unknown'}
                                                        </span>
                                                    </td>
                                                    <td className={`px-4 py-2.5 text-right font-bold ${isInflow ? 'text-emerald-600' : 'text-rose-600'} print:text-gray-900`}>
                                                        {isInflow ? '+' : '−'} {formatPKR(txn.amount)}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </div>

                {/* Print Signatures Block (Only visible on print) */}
                <div className="hidden print:flex justify-between items-end mt-24 px-8">
                    <div className="text-center w-48">
                        <div className="border-b border-gray-800 h-8 mb-2"></div>
                        <p className="text-xs font-semibold uppercase">Prepared By</p>
                        <p className="text-[10px] text-gray-500">Finance Officer</p>
                    </div>
                    <div className="text-center w-48">
                        <div className="border-b border-gray-800 h-8 mb-2"></div>
                        <p className="text-xs font-semibold uppercase">Reviewed By</p>
                        <p className="text-[10px] text-gray-500">Finance Manager</p>
                    </div>
                    <div className="text-center w-48">
                        <div className="border-b border-gray-800 h-8 mb-2"></div>
                        <p className="text-xs font-semibold uppercase">Approved By</p>
                        <p className="text-[10px] text-gray-500">Director Finance</p>
                    </div>
                </div>
            </div>

            {/* Global print styles to hide sidebar and header */}
            <style dangerouslySetInnerHTML={{
                __html: `
                @media print {
                    aside, header, nav, .print\\:hidden { display: none !important; }
                    main { padding: 0 !important; overflow: visible !important; }
                    body { background: white !important; }
                    #printable-report { width: 100%; max-width: none; margin: 0; padding: 20px; }
                }
            `}} />
        </div>
    );
}
