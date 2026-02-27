'use client';

import { useState } from 'react';
import { ArrowUpRight, ArrowDownRight, ArrowRightLeft, Search } from 'lucide-react';

const REF_LABEL: Record<string, string> = {
    FEE_INVOICE: 'Student Fee',
    PAYROLL_SLIP: 'Salary Payment',
    VENDOR_BILL: 'Vendor',
    EXPENSE_RECORD: 'Expense',
    MANUAL: 'Manual Entry',
};

function formatPKR(n: number) {
    return new Intl.NumberFormat('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
}

function formatDate(d: string) {
    return new Date(d).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function TransactionTable({ txns }: { txns: any[] }) {
    const [search, setSearch] = useState('');

    const filtered = txns.filter(t => {
        const q = search.toLowerCase();
        if (!q) return true;
        const description = t.notes || (t.referenceType ? REF_LABEL[t.referenceType] || t.referenceType : '—');
        const walletName = t.walletId?.name || '';
        const categoryName = t.categoryId?.name || '';
        const typeString = t.type || '';

        return description.toLowerCase().includes(q)
            || walletName.toLowerCase().includes(q)
            || categoryName.toLowerCase().includes(q)
            || (t.amount || '').toString().includes(q)
            || typeString.toLowerCase().includes(q);
    });

    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 py-4 border-b border-gray-100">
                <h2 className="font-semibold text-gray-900 text-sm">All Transactions</h2>
                <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 text-gray-400" size={15} />
                    <input
                        type="text"
                        placeholder="Search transactions..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-sm w-full sm:w-64 focus:outline-none focus:ring-1 focus:ring-leads-blue"
                    />
                </div>
            </div>

            {filtered.length === 0 ? (
                <div className="py-16 text-center">
                    <ArrowRightLeft size={32} className="text-gray-200 mx-auto mb-3" />
                    <p className="text-gray-500 font-medium">{search ? 'No matching transactions' : 'No transactions yet'}</p>
                    <p className="text-sm text-gray-400 mt-1">{search ? 'Try adjusting your search query.' : 'Transactions will appear here as money moves in and out.'}</p>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-100">
                                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Description</th>
                                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Category</th>
                                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Wallet</th>
                                <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Amount</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {filtered.map((txn: any) => {
                                const isIn = txn.type === 'IN';
                                const isTransfer = txn.type === 'TRANSFER';
                                const description = txn.notes
                                    || (txn.referenceType ? REF_LABEL[txn.referenceType] || txn.referenceType : '—');

                                return (
                                    <tr key={txn._id} className="hover:bg-gray-50/60 transition-colors">
                                        <td className="px-5 py-3.5 text-gray-500 text-xs whitespace-nowrap">
                                            {formatDate(txn.date)}
                                        </td>
                                        <td className="px-5 py-3.5 max-w-[220px]">
                                            <p className="text-gray-800 font-medium truncate">{description}</p>
                                            {txn.referenceType && (
                                                <span className="text-[10px] text-gray-400">
                                                    {REF_LABEL[txn.referenceType] || txn.referenceType}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-5 py-3.5">
                                            {txn.categoryId ? (
                                                <span className="text-xs text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full">
                                                    {(txn.categoryId as any).name}
                                                </span>
                                            ) : (
                                                <span className="text-xs text-gray-300">—</span>
                                            )}
                                        </td>
                                        <td className="px-5 py-3.5">
                                            <p className="text-xs text-gray-600 font-medium">
                                                {txn.walletId ? (txn.walletId as any).name : '—'}
                                            </p>
                                        </td>
                                        <td className="px-5 py-3.5 text-right whitespace-nowrap">
                                            <span className={`inline-flex items-center gap-1 font-bold text-sm ${isTransfer ? 'text-indigo-600'
                                                : isIn ? 'text-emerald-600'
                                                    : 'text-rose-600'
                                                }`}>
                                                {isTransfer ? <ArrowRightLeft size={12} /> : isIn ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                                                {isIn ? '+' : isTransfer ? '' : '−'} PKR {formatPKR(txn.amount)}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
