/* eslint-disable @typescript-eslint/no-explicit-any */
import dbConnect from '@/lib/mongodb';
import Transaction from '@/models/finance/Transaction';
import { ArrowUpRight, ArrowDownRight, ArrowRightLeft, Activity } from 'lucide-react';
import TransactionTable from './TransactionTable';
import Pagination from '../_components/Pagination';

function formatPKR(n: number) {
    return new Intl.NumberFormat('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
}

export default async function TransactionsPage({
    searchParams,
}: {
    searchParams: { page?: string; search?: string; type?: string };
}) {
    await dbConnect();

    const page = parseInt(searchParams.page || '1');
    const limit = 50;
    const search = searchParams.search || '';
    const typeFilter = searchParams.type || '';

    const query: any = {};
    if (typeFilter) {
        query.txType = typeFilter;
    }
    if (search) {
        query.$or = [
            { txType: { $regex: search, $options: 'i' } },
            { referenceModel: { $regex: search, $options: 'i' } },
            { notes: { $regex: search, $options: 'i' } },
        ];
    }

    // Get paginated transactions
    const rawTxns = await Transaction.find(query)
        .sort({ date: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('walletId', 'name type')
        .populate('categoryId', 'name type')
        .lean();

    const txns = JSON.parse(JSON.stringify(rawTxns));

    const totalCount = await Transaction.countDocuments(query);
    const totalPages = Math.ceil(totalCount / limit);

    // Calculate totals over entire dataset (only recent 1000 for performance on net strip, or just show paginated total) 
    // Usually a net dashboard is separate. Here we'll sum over the paginated results for simplicity, since counting entire history is heavy.
    const totalIn = txns.filter((t: any) => t.txType === 'FEE_PAYMENT' || t.txType === 'SECURITY_DEPOSIT' || t.txType === 'INVESTMENT_RETURN').reduce((s: number, t: any) => s + t.amount, 0);
    const totalOut = txns.filter((t: any) => t.txType === 'EXPENSE_PAYMENT' || t.txType === 'PAYROLL_PAYMENT' || t.txType === 'REFUND' || t.txType === 'STUDENT_ADVANCE_DEDUCTION').reduce((s: number, t: any) => s + t.amount, 0);

    return (
        <div className="space-y-6 flex flex-col min-h-full max-w-[1200px]">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <span className="text-xs font-semibold text-leads-blue uppercase tracking-widest">Khatta Engine</span>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight mt-0.5">Transactions</h1>
                    <p className="text-sm text-gray-500">
                        {totalCount} money movements found
                    </p>
                </div>
                <span className="flex items-center gap-1.5 text-xs bg-gray-50 border border-gray-100 text-gray-500 px-3 py-1.5 rounded-full">
                    <Activity size={11} /> Live
                </span>
            </div>

            {/* Summary strip - Showing only paginated view */}
            <div className="grid grid-cols-3 gap-4">
                <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <ArrowUpRight size={15} className="text-emerald-600" />
                        <p className="text-xs font-medium text-emerald-700">Inflow (On Page)</p>
                    </div>
                    <p className="text-xl font-bold text-emerald-700">PKR {formatPKR(totalIn)}</p>
                </div>
                <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <ArrowDownRight size={15} className="text-rose-600" />
                        <p className="text-xs font-medium text-rose-700">Outflow (On Page)</p>
                    </div>
                    <p className="text-xl font-bold text-rose-700">PKR {formatPKR(totalOut)}</p>
                </div>
                <div className={`border rounded-2xl p-4 ${totalIn - totalOut >= 0 ? 'bg-indigo-50 border-indigo-100' : 'bg-rose-50 border-rose-100'}`}>
                    <div className="flex items-center gap-2 mb-2">
                        <ArrowRightLeft size={15} className={totalIn - totalOut >= 0 ? 'text-indigo-600' : 'text-rose-600'} />
                        <p className={`text-xs font-medium ${totalIn - totalOut >= 0 ? 'text-indigo-700' : 'text-rose-700'}`}>Net (On Page)</p>
                    </div>
                    <p className={`text-xl font-bold ${totalIn - totalOut >= 0 ? 'text-indigo-700' : 'text-rose-700'}`}>
                        {totalIn - totalOut >= 0 ? '+' : '−'} PKR {formatPKR(Math.abs(totalIn - totalOut))}
                    </p>
                </div>
            </div>

            {/* Table */}
            <TransactionTable txns={txns} initialSearch={search} initialType={typeFilter} />
            <Pagination currentPage={page} totalPages={totalPages} totalCount={totalCount} />
        </div>
    );
}
