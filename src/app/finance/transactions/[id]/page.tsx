import dbConnect from '@/lib/mongodb';
import Transaction from '@/models/finance/Transaction';
import { ArrowLeft, ArrowUpRight, ArrowDownRight, ArrowRightLeft, CheckCircle2, XCircle, RotateCcw } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import ReversalButton from './ReversalButton';

function formatPKR(n: number) {
    return new Intl.NumberFormat('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
}

function formatDate(d: Date | string) {
    return new Date(d).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default async function TransactionDetailsPage({ params }: { params: { id: string } }) {
    await dbConnect();
    const rawTxn = await Transaction.findById(params.id)
        .populate('walletId', 'name type')
        .populate('categoryId', 'name type')
        .populate('performedBy', 'name email role')
        .populate('linkedTxId')
        .populate('reversedByTxId')
        .lean();

    if (!rawTxn) return notFound();
    const txn = JSON.parse(JSON.stringify(rawTxn));

    const isIn = ['FEE_PAYMENT', 'SECURITY_DEPOSIT', 'INVESTMENT_RETURN', 'WALLET_TRANSFER_IN'].includes(txn.txType);
    const isOut = ['EXPENSE_PAYMENT', 'PAYROLL_PAYMENT', 'REFUND', 'INVESTMENT_OUTFLOW', 'WALLET_TRANSFER_OUT', 'STUDENT_ADVANCE_DEDUCTION'].includes(txn.txType);
    const isTransfer = ['WALLET_TRANSFER_IN', 'WALLET_TRANSFER_OUT'].includes(txn.txType);
    const isReversal = txn.txType === 'REVERSAL';

    return (
        <div className="max-w-[800px] mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/finance/transactions" className="p-2 rounded-full hover:bg-gray-100 transition-colors">
                    <ArrowLeft size={20} className="text-gray-600" />
                </Link>
                <div>
                    <h1 className="text-xl font-bold text-gray-900 tracking-tight">Transaction Details</h1>
                    <p className="text-sm text-gray-500 font-mono mt-0.5">{txn._id}</p>
                </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="p-6 sm:p-8 flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-gray-100 bg-gray-50/50">
                    <div className="space-y-4">
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-gray-200 shadow-sm text-xs font-semibold uppercase tracking-wider text-gray-600">
                            {isTransfer ? <ArrowRightLeft size={14} className="text-indigo-500" /> : isIn ? <ArrowUpRight size={14} className="text-emerald-500" /> : isReversal ? <RotateCcw size={14} className="text-gray-500" /> : <ArrowDownRight size={14} className="text-rose-500" />}
                            {txn.txType.replace(/_/g, ' ')}
                        </div>

                        {txn.isReversed ? (
                            <div className="flex items-center gap-2 text-rose-600 bg-rose-50 px-3 py-2 rounded-lg text-sm font-medium border border-rose-100">
                                <XCircle size={16} /> REVERSED
                            </div>
                        ) : isReversal ? (
                            <div className="flex items-center gap-2 text-gray-600 bg-gray-100 px-3 py-2 rounded-lg text-sm font-medium border border-gray-200">
                                <CheckCircle2 size={16} className="text-gray-500" /> VALID REVERSAL ENTRY
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-3 py-2 rounded-lg text-sm font-medium border border-emerald-100">
                                <CheckCircle2 size={16} /> COMPLETED & POSTED
                            </div>
                        )}
                    </div>

                    <div className="text-left md:text-right">
                        <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1">Total Amount</p>
                        <p className={`text-4xl font-bold tracking-tight ${isTransfer ? 'text-indigo-700' : isIn ? 'text-emerald-700' : isReversal ? 'text-gray-700' : 'text-rose-700'}`}>
                            {isIn ? '+' : isTransfer ? '' : isReversal ? '±' : '−'} PKR {formatPKR(txn.amount)}
                        </p>
                    </div>
                </div>

                <div className="p-6 sm:p-8 space-y-8">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6">
                        <div>
                            <p className="text-xs text-gray-500 font-semibold mb-1">Date & Time</p>
                            <p className="text-sm font-medium text-gray-900">{formatDate(txn.date)}</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 font-semibold mb-1">Affected Wallet</p>
                            <p className="text-sm font-medium text-gray-900">{txn.walletId ? txn.walletId.name : 'Unknown Wallet'} <span className="text-xs text-gray-400 font-normal ml-1">({txn.walletId?.type})</span></p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 font-semibold mb-1">Category</p>
                            <p className="text-sm font-medium text-gray-900">{txn.categoryId ? txn.categoryId.name : 'Uncategorized'}</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 font-semibold mb-1">Performed By</p>
                            <p className="text-sm font-medium text-gray-900">{txn.performedBy ? `${txn.performedBy.name} (${txn.performedBy.email})` : 'System'}</p>
                        </div>
                    </div>

                    <div className="pt-6 border-t border-gray-100">
                        <p className="text-xs text-gray-500 font-semibold mb-2">Description / Notes</p>
                        <p className="text-sm text-gray-800 bg-gray-50 p-4 rounded-xl border border-gray-100">{txn.notes || 'No standard description provided.'}</p>
                    </div>

                    {(txn.referenceModel || txn.referenceId) && (
                        <div className="pt-6 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div>
                                <p className="text-xs text-gray-500 font-semibold mb-1">Source Record Type</p>
                                <p className="text-sm font-medium text-gray-900">{txn.referenceModel || 'N/A'}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 font-semibold mb-1">Source ID</p>
                                <p className="text-sm font-medium text-gray-900 font-mono text-xs">{txn.referenceId || 'N/A'}</p>
                            </div>
                        </div>
                    )}

                    {txn.isReversed && txn.reversedByTxId && (
                        <div className="pt-6 border-t border-gray-100">
                            <div className="bg-rose-50 border border-rose-100 rounded-xl p-4">
                                <p className="text-xs font-bold text-rose-800 uppercase tracking-widest mb-1">Reversed By</p>
                                <Link href={`/finance/transactions/${txn.reversedByTxId._id || txn.reversedByTxId}`} className="text-sm text-leads-blue hover:underline font-medium">
                                    View Reversal Transaction →
                                </Link>
                            </div>
                        </div>
                    )}

                    {isReversal && txn.referenceId && (
                        <div className="pt-6 border-t border-gray-100">
                            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                                <p className="text-xs font-bold text-gray-600 uppercase tracking-widest mb-1">Original Transaction</p>
                                <p className="text-sm text-gray-700">This entry reverses an earlier transaction to correct the ledgers.</p>
                                {/* Note: if referenceId contains the original TX ID. Wait, reversal logic uses referenceId of the original transaction, not the generic referenceId. But referenceId of original is copied verbatim. The original TxId isn't stored explicitly except they map to the same reference. To be exact, reversing transaction copies original's referenceId/model. But it points to FeeInvoice etc., not the Tx. */}
                            </div>
                        </div>
                    )}

                    {!txn.isReversed && !isReversal && txn.txType !== 'STUDENT_ADVANCE_DEDUCTION' && (
                        <div className="pt-8 border-t border-gray-100 flex justify-end">
                            <ReversalButton txId={txn._id} isReversed={txn.isReversed} txType={txn.txType} />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
