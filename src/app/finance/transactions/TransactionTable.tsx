'use client';

import { useState, useEffect } from 'react';
import { ArrowUpRight, ArrowDownRight, ArrowRightLeft, Search, Eye } from 'lucide-react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';

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

export default function TransactionTable({ txns, initialSearch = '', initialType = '' }: { txns: any[], initialSearch?: string, initialType?: string }) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const [search, setSearch] = useState(initialSearch);
    const [typeFilter, setTypeFilter] = useState(initialType);

    // Debounce search update to URL
    useEffect(() => {
        const handler = setTimeout(() => {
            const params = new URLSearchParams(searchParams.toString());
            if (search) params.set('search', search); else params.delete('search');
            if (typeFilter) params.set('type', typeFilter); else params.delete('type');

            // If changing search/filter, reset to page 1
            if (search !== initialSearch || typeFilter !== initialType) {
                params.set('page', '1');
            }

            router.push(`${pathname}?${params.toString()}`);
        }, 300);

        return () => clearTimeout(handler);
    }, [search, typeFilter, pathname, searchParams, router]);

    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden border-b-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 py-4 border-b border-gray-100">
                <h2 className="font-semibold text-gray-900 text-sm">All Transactions</h2>
                <div className="flex items-center gap-3">
                    <select
                        value={typeFilter}
                        onChange={e => setTypeFilter(e.target.value)}
                        className="py-2 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-leads-blue bg-white"
                    >
                        <option value="">All Types</option>
                        <option value="FEE_PAYMENT">Fee Payment</option>
                        <option value="EXPENSE_PAYMENT">Expense Payment</option>
                        <option value="PAYROLL_PAYMENT">Payroll Payment</option>
                        <option value="WALLET_TRANSFER_OUT">Transfer Out</option>
                        <option value="WALLET_TRANSFER_IN">Transfer In</option>
                        <option value="SECURITY_DEPOSIT">Security Deposit</option>
                        <option value="REFUND">Refund</option>
                        <option value="INVESTMENT_OUTFLOW">Investment Outflow</option>
                        <option value="INVESTMENT_RETURN">Investment Return</option>
                    </select>
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
            </div>

            {txns.length === 0 ? (
                <div className="py-16 text-center border-b border-gray-100">
                    <ArrowRightLeft size={32} className="text-gray-200 mx-auto mb-3" />
                    <p className="text-gray-500 font-medium">{search || typeFilter ? 'No matching transactions' : 'No transactions yet'}</p>
                    <p className="text-sm text-gray-400 mt-1">{search || typeFilter ? 'Try adjusting your search query.' : 'Transactions will appear here as money moves in and out.'}</p>
                </div>
            ) : (
                <div className="overflow-x-auto border-b border-gray-100">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-100">
                                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Description</th>
                                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Category</th>
                                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Wallet</th>
                                <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Amount</th>
                                <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {txns.map((txn: any) => {
                                // Reversal transactions or Reversed transactions have visual indicators
                                const isReversalType = txn.txType === 'REVERSAL';
                                const isReversed = txn.isReversed;

                                // Determine in/out for display depending on transaction type
                                const isIn = ['FEE_PAYMENT', 'SECURITY_DEPOSIT', 'INVESTMENT_RETURN'].includes(txn.txType);
                                const isTransfer = ['WALLET_TRANSFER_IN', 'WALLET_TRANSFER_OUT'].includes(txn.txType);
                                const description = txn.notes
                                    || (txn.referenceType ? REF_LABEL[txn.referenceType] || txn.referenceType : '—');

                                return (
                                    <tr key={txn._id} className={`hover:bg-gray-50/60 transition-colors ${isReversed || isReversalType ? 'bg-gray-50/50 opacity-75' : ''}`}>
                                        <td className="px-5 py-3.5 text-gray-500 text-xs whitespace-nowrap">
                                            {formatDate(txn.date)}
                                        </td>
                                        <td className="px-5 py-3.5 max-w-[220px]">
                                            <p className={`font-medium truncate ${isReversed ? 'text-gray-500 line-through' : 'text-gray-800'}`}>{description}</p>
                                            <div className="flex gap-1.5 mt-0.5 items-center flex-wrap">
                                                {txn.referenceModel && (
                                                    <span className="text-[10px] text-gray-400">
                                                        {REF_LABEL[txn.referenceModel] || txn.referenceModel}
                                                    </span>
                                                )}
                                                {isReversed && <span className="text-[9px] font-bold text-rose-500 bg-rose-50 px-1.5 py-0.5 rounded">REVERSED</span>}
                                                {isReversalType && <span className="text-[9px] font-bold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">REVERSAL ENTRY</span>}
                                            </div>
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
                                                } ${isReversed ? 'opacity-50' : ''}`}>
                                                {isTransfer ? <ArrowRightLeft size={12} /> : isIn ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                                                {isIn ? '+' : isTransfer ? '' : '−'} PKR {formatPKR(txn.amount)}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3.5 text-right">
                                            <Link href={`/finance/transactions/${txn._id}`} className="inline-flex items-center gap-1 text-xs font-medium text-leads-blue hover:text-blue-800 bg-blue-50 px-2 py-1 rounded transition-colors">
                                                <Eye size={13} /> View
                                            </Link>
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
