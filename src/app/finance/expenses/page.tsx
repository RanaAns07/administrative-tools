/* eslint-disable @typescript-eslint/no-explicit-any */
import dbConnect from '@/lib/mongodb';
import ExpenseRecord from '@/models/finance/ExpenseRecord';
import Wallet from '@/models/finance/Wallet';
import Category from '@/models/finance/Category';
import { Receipt, Plus, ArrowDownRight } from 'lucide-react';
import ExpenseModal from './ExpenseModal';
import Pagination from '../_components/Pagination';
import RoleGuard from '../_components/RoleGuard';

function formatPKR(n: number) {
    return new Intl.NumberFormat('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
}

function formatDate(d: string) {
    return new Date(d).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default async function ExpensesPage({ searchParams }: { searchParams: { [key: string]: string | string[] | undefined } }) {
    await dbConnect();

    // Summary totals (ignores pagination to show full financial picture)
    const allExpenses = await ExpenseRecord.find({}).lean();
    const totalSpent = allExpenses.reduce((s: number, e: any) => s + (e.amount || 0), 0);

    // Dependencies
    const wallets = await Wallet.find({ isActive: true }).lean();
    const categories = await Category.find({ type: 'EXPENSE', isActive: true }).lean();

    // Pagination
    const page = typeof searchParams.page === 'string' ? parseInt(searchParams.page) : 1;
    const limit = 50;
    const totalCount = await ExpenseRecord.countDocuments({});
    const totalPages = Math.ceil(totalCount / limit);

    const rawExpenses = await ExpenseRecord
        .find({})
        .sort({ date: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('categoryId', 'name')
        .populate('walletId', 'name type')
        .populate('recordedBy', 'name email')
        .lean();
    const expenses = JSON.parse(JSON.stringify(rawExpenses));

    return (
        <div className="space-y-6 max-w-[1100px] flex flex-col min-h-full">

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <span className="text-xs font-semibold text-leads-blue uppercase tracking-widest">Money Out</span>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight mt-0.5">Expenses</h1>
                    <p className="text-sm text-gray-400">{totalCount} record{totalCount !== 1 ? 's' : ''} · PKR {formatPKR(totalSpent)} total</p>
                </div>
                <RoleGuard>
                    <ExpenseModal
                        wallets={JSON.parse(JSON.stringify(wallets))}
                        categories={JSON.parse(JSON.stringify(categories))}
                    />
                </RoleGuard>
            </div>

            {/* Total spent card */}
            {totalCount > 0 && (
                <div className="bg-rose-50 border border-rose-100 rounded-2xl p-5 flex items-center gap-4">
                    <div className="p-3 bg-rose-100 text-rose-600 rounded-xl">
                        <ArrowDownRight size={24} />
                    </div>
                    <div>
                        <p className="text-xs font-medium text-rose-500 uppercase tracking-wider mb-0.5">Total Recorded Expenses</p>
                        <p className="text-2xl font-bold text-rose-700">PKR {formatPKR(totalSpent)}</p>
                    </div>
                </div>
            )}

            {/* Table */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden border-b-0">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                    <h2 className="font-semibold text-gray-900 text-sm flex items-center gap-2">
                        <Receipt size={15} className="text-gray-400" />
                        Expense Records
                    </h2>
                    <span className="text-xs text-gray-400">{totalCount} entries</span>
                </div>

                {expenses.length === 0 ? (
                    <div className="py-20 text-center border-b border-gray-100">
                        <Receipt size={36} className="text-gray-200 mx-auto mb-3" />
                        <p className="text-gray-500 font-medium">No expenses recorded</p>
                        <p className="text-sm text-gray-400 mt-1">Use the button above to record your first expense.</p>
                        <div className="mt-4">
                            <RoleGuard>
                                <ExpenseModal
                                    wallets={JSON.parse(JSON.stringify(wallets))}
                                    categories={JSON.parse(JSON.stringify(categories))}
                                />
                            </RoleGuard>
                        </div>
                    </div>
                ) : (
                    <div className="overflow-x-auto border-b border-gray-100">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-100">
                                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Title</th>
                                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Category</th>
                                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">From Wallet</th>
                                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Recorded By</th>
                                    <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Amount</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {expenses.map((exp: any) => (
                                    <tr key={exp._id} className="hover:bg-gray-50/60 transition-colors group">
                                        <td className="px-5 py-3.5 text-gray-500 text-xs whitespace-nowrap">
                                            {formatDate(exp.date)}
                                        </td>
                                        <td className="px-5 py-3.5 max-w-[240px]">
                                            <p className="text-gray-800 font-medium truncate">{exp.title}</p>
                                            {exp.notes && (
                                                <p className="text-xs text-gray-400 truncate mt-0.5">{exp.notes}</p>
                                            )}
                                            {exp.receiptUrl && (
                                                <a
                                                    href={exp.receiptUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-[10px] text-leads-blue hover:underline"
                                                >
                                                    View Receipt ↗
                                                </a>
                                            )}
                                        </td>
                                        <td className="px-5 py-3.5">
                                            {exp.categoryId ? (
                                                <span className="text-xs text-rose-700 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded-full">
                                                    {(exp.categoryId as any).name}
                                                </span>
                                            ) : (
                                                <span className="text-xs text-gray-300">—</span>
                                            )}
                                        </td>
                                        <td className="px-5 py-3.5">
                                            <p className="text-xs text-gray-600 font-medium">
                                                {exp.walletId ? (exp.walletId as any).name : '—'}
                                            </p>
                                        </td>
                                        <td className="px-5 py-3.5 text-xs text-gray-400">
                                            {exp.recordedBy ? (exp.recordedBy as any).name || (exp.recordedBy as any).email : '—'}
                                        </td>
                                        <td className="px-5 py-3.5 text-right whitespace-nowrap">
                                            <span className="font-bold text-rose-600 flex items-center justify-end gap-1">
                                                <ArrowDownRight size={12} />
                                                PKR {formatPKR(exp.amount)}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
            <Pagination currentPage={page} totalPages={totalPages} totalCount={totalCount} />
        </div>
    );
}
