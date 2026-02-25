'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, RefreshCw, Loader2, ArrowUp, ArrowDown, Eye, X } from 'lucide-react';

interface LedgerEntry {
    _id: string;
    jeId?: string;           // full JE document id
    entryNumber: string; entryDate: string; description: string;
    reference: string; source: string;
    accountCode: string; accountName: string;
    debit: number; credit: number; narration: string;
    runningBalance: number;
}

interface LedgerData {
    ledgerEntries: LedgerEntry[];
    totalDebit: number; totalCredit: number;
    closingBalance: number; entryCount: number;
}

interface JELine {
    accountCode: string; accountName: string; debit: number; credit: number; narration?: string;
}

interface JEDetail {
    entryNumber: string; entryDate: string; description: string;
    source: string; status: string; createdBy?: string;
    totalDebit: number; totalCredit: number;
    lines: JELine[];
}

export default function GeneralLedgerPage() {
    const [data, setData] = useState<LedgerData | null>(null);
    const [loading, setLoading] = useState(false);
    const [accountCode, setAccountCode] = useState('');
    const [from, setFrom] = useState('');
    const [to, setTo] = useState(new Date().toISOString().split('T')[0]);
    const [error, setError] = useState<string | null>(null);

    // Detail modal state
    const [detailEntry, setDetailEntry] = useState<JEDetail | null>(null);
    const [detailLoading, setDetailLoading] = useState(false);

    const load = () => {
        if (!accountCode.trim()) { setError('Account code is required.'); return; }
        setLoading(true); setError(null);
        const qs = new URLSearchParams({ accountCode: accountCode.trim() });
        if (from) qs.set('from', from);
        if (to) qs.set('to', to);
        fetch(`/api/finance/general-ledger?${qs}`)
            .then(r => r.json())
            .then(d => { if (d.error) throw new Error(d.error); setData(d); })
            .catch(e => setError(e.message))
            .finally(() => setLoading(false));
    };

    const openDetail = async (entry: LedgerEntry) => {
        // Use jeId if available, otherwise look it up by entryNumber via JE API
        const id = entry.jeId || entry._id;
        if (!id) return;
        setDetailLoading(true);
        setDetailEntry(null);
        try {
            const res = await fetch(`/api/finance/journal-entries/${id}`);
            const d = await res.json();
            if (d.error) throw new Error(d.error);
            // Normalize line fields
            const lines: JELine[] = (d.lines || []).map((l: any) => ({
                accountCode: l.account?.accountCode || l.accountCode || '—',
                accountName: l.account?.accountName || l.accountName || '—',
                debit: l.debit || 0,
                credit: l.credit || 0,
                narration: l.narration || '',
            }));
            setDetailEntry({
                entryNumber: d.entryNumber,
                entryDate: d.entryDate,
                description: d.description,
                source: d.source,
                status: d.status,
                createdBy: d.createdBy,
                totalDebit: d.totalDebit,
                totalCredit: d.totalCredit,
                lines,
            });
        } catch (e: any) {
            setError(e.message);
        } finally {
            setDetailLoading(false);
        }
    };

    const statusColors: Record<string, string> = {
        POSTED: 'bg-green-100 text-green-700',
        DRAFT: 'bg-gray-100 text-gray-600',
        PENDING_APPROVAL: 'bg-yellow-100 text-yellow-700',
        REJECTED: 'bg-red-100 text-red-700',
    };

    return (
        <div className="space-y-5">
            <div>
                <h1 className="text-xl font-bold text-leads-blue flex items-center gap-2"><BookOpen size={22} /> General Ledger</h1>
                <p className="text-xs text-gray-500 mt-0.5">Per-account drill-down with running balance · click <Eye size={11} className="inline" /> to see full journal entry</p>
            </div>

            {/* Controls */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap gap-3 items-end">
                <div>
                    <label className="text-xs font-semibold text-gray-600 mb-1 block">Account Code *</label>
                    <input type="text" value={accountCode} onChange={e => setAccountCode(e.target.value)} onKeyDown={e => e.key === 'Enter' && load()}
                        placeholder="e.g. 1001" className="w-40 border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-leads-blue" />
                </div>
                <div>
                    <label className="text-xs font-semibold text-gray-600 mb-1 block">From</label>
                    <input type="date" value={from} onChange={e => setFrom(e.target.value)}
                        className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-leads-blue" />
                </div>
                <div>
                    <label className="text-xs font-semibold text-gray-600 mb-1 block">To</label>
                    <input type="date" value={to} onChange={e => setTo(e.target.value)}
                        className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-leads-blue" />
                </div>
                <button onClick={load} disabled={loading}
                    className="flex items-center gap-2 bg-leads-blue text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-800 transition-colors">
                    {loading ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />} Load Ledger
                </button>
                {error && <p className="text-red-600 text-xs">{error}</p>}
            </div>

            {/* Summary bar */}
            {data && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                        { label: 'Entries', value: data.entryCount, cls: 'text-gray-800' },
                        { label: 'Total Debit', value: `PKR ${data.totalDebit.toLocaleString('en-PK', { minimumFractionDigits: 2 })}`, cls: 'text-blue-700' },
                        { label: 'Total Credit', value: `PKR ${data.totalCredit.toLocaleString('en-PK', { minimumFractionDigits: 2 })}`, cls: 'text-orange-700' },
                        { label: 'Closing Balance', value: `PKR ${data.closingBalance.toLocaleString('en-PK', { minimumFractionDigits: 2 })}`, cls: data.closingBalance >= 0 ? 'text-green-700' : 'text-red-700' },
                    ].map(s => (
                        <div key={s.label} className="bg-white rounded-xl border border-gray-200 px-4 py-3">
                            <p className="text-[10px] text-gray-500 uppercase tracking-wider">{s.label}</p>
                            <p className={`text-sm font-bold mt-0.5 ${s.cls}`}>{s.value}</p>
                        </div>
                    ))}
                </motion.div>
            )}

            {/* Ledger Table */}
            {data && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 border-b border-gray-100 text-xs uppercase text-gray-500 font-semibold sticky top-0">
                                <tr>
                                    <th className="px-4 py-3">Date</th>
                                    <th className="px-4 py-3">JE #</th>
                                    <th className="px-4 py-3">Description</th>
                                    <th className="px-4 py-3">Narration</th>
                                    <th className="px-4 py-3 text-right">Debit</th>
                                    <th className="px-4 py-3 text-right">Credit</th>
                                    <th className="px-4 py-3 text-right">Balance</th>
                                    <th className="px-4 py-3 text-center">Details</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {data.ledgerEntries.length === 0 ? (
                                    <tr><td colSpan={8} className="py-10 text-center text-gray-400 text-sm">No posted transactions for this account in the selected period.</td></tr>
                                ) : data.ledgerEntries.map((e, i) => (
                                    <motion.tr key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.01 }}
                                        className="hover:bg-blue-50/20 transition-colors">
                                        <td className="px-4 py-2.5 text-xs text-gray-500 whitespace-nowrap">{new Date(e.entryDate).toLocaleDateString('en-PK')}</td>
                                        <td className="px-4 py-2.5 font-mono text-xs font-semibold text-leads-blue">{e.entryNumber}</td>
                                        <td className="px-4 py-2.5 text-sm text-gray-700 max-w-[200px] truncate" title={e.description}>{e.description}</td>
                                        <td className="px-4 py-2.5 text-xs text-gray-400 max-w-[160px] truncate" title={e.narration}>{e.narration || '—'}</td>
                                        <td className="px-4 py-2.5 text-right font-mono text-sm">
                                            {e.debit > 0 ? (
                                                <span className="flex items-center justify-end gap-1 text-blue-700">
                                                    <ArrowUp size={11} />
                                                    {e.debit.toLocaleString('en-PK', { minimumFractionDigits: 2 })}
                                                </span>
                                            ) : <span className="text-gray-300">—</span>}
                                        </td>
                                        <td className="px-4 py-2.5 text-right font-mono text-sm">
                                            {e.credit > 0 ? (
                                                <span className="flex items-center justify-end gap-1 text-orange-700">
                                                    <ArrowDown size={11} />
                                                    {e.credit.toLocaleString('en-PK', { minimumFractionDigits: 2 })}
                                                </span>
                                            ) : <span className="text-gray-300">—</span>}
                                        </td>
                                        <td className={`px-4 py-2.5 text-right font-mono text-sm font-semibold ${e.runningBalance >= 0 ? 'text-gray-800' : 'text-red-600'}`}>
                                            {e.runningBalance.toLocaleString('en-PK', { minimumFractionDigits: 2 })}
                                        </td>
                                        <td className="px-4 py-2.5 text-center">
                                            <button
                                                onClick={() => openDetail(e)}
                                                title="View full journal entry"
                                                className="inline-flex items-center gap-1 text-leads-blue hover:bg-blue-50 px-2 py-1 rounded-lg text-xs font-medium transition-colors"
                                            >
                                                <Eye size={13} /> View
                                            </button>
                                        </td>
                                    </motion.tr>
                                ))}
                            </tbody>
                            <tfoot className="bg-leads-blue text-white">
                                <tr>
                                    <td colSpan={4} className="px-4 py-3 font-bold text-sm">TOTALS</td>
                                    <td className="px-4 py-3 text-right font-bold font-mono">{data.totalDebit.toLocaleString('en-PK', { minimumFractionDigits: 2 })}</td>
                                    <td className="px-4 py-3 text-right font-bold font-mono">{data.totalCredit.toLocaleString('en-PK', { minimumFractionDigits: 2 })}</td>
                                    <td className="px-4 py-3 text-right font-bold font-mono">{data.closingBalance.toLocaleString('en-PK', { minimumFractionDigits: 2 })}</td>
                                    <td />
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </motion.div>
            )}

            {!data && !loading && (
                <div className="bg-white rounded-xl border border-gray-200 py-16 text-center text-gray-400">
                    <BookOpen size={40} className="mx-auto mb-3 opacity-30" />
                    <p className="text-sm">Enter an account code and click Load Ledger to view the transaction history.</p>
                </div>
            )}

            {/* JE Detail Modal */}
            <AnimatePresence>
                {(detailEntry || detailLoading) && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden"
                        >
                            {/* Modal header */}
                            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                                <div>
                                    {detailEntry ? (
                                        <>
                                            <h2 className="font-bold text-leads-blue text-lg">{detailEntry.entryNumber}</h2>
                                            <p className="text-xs text-gray-400 mt-0.5">{detailEntry.description} · {new Date(detailEntry.entryDate).toLocaleDateString('en-PK')}</p>
                                        </>
                                    ) : (
                                        <h2 className="font-bold text-leads-blue text-lg">Loading…</h2>
                                    )}
                                </div>
                                <button onClick={() => { setDetailEntry(null); setDetailLoading(false); }} className="text-gray-400 hover:text-gray-600">
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Modal body */}
                            <div className="px-6 py-5">
                                {detailLoading && (
                                    <div className="py-10 text-center"><Loader2 size={26} className="animate-spin mx-auto text-gray-400" /></div>
                                )}
                                {detailEntry && (
                                    <>
                                        {/* Meta row */}
                                        <div className="flex flex-wrap gap-3 mb-4">
                                            {[
                                                { label: 'Source', value: detailEntry.source },
                                                { label: 'Status', value: detailEntry.status },
                                                { label: 'Created By', value: detailEntry.createdBy || '—' },
                                            ].map(m => (
                                                <div key={m.label} className="bg-gray-50 rounded-lg px-3 py-2 text-xs">
                                                    <p className="text-gray-400 uppercase tracking-wider text-[10px]">{m.label}</p>
                                                    <p className={`font-semibold mt-0.5 ${m.label === 'Status' ? (statusColors[m.value] || 'text-gray-700') : 'text-gray-700'}`}>{m.value}</p>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Lines table */}
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Journal Lines — all accounts involved in this entry</p>
                                        <div className="border border-gray-100 rounded-xl overflow-hidden">
                                            <table className="w-full text-xs">
                                                <thead className="bg-gray-50 border-b border-gray-100">
                                                    <tr>
                                                        <th className="text-left px-4 py-2.5 font-semibold text-gray-500">Account Code</th>
                                                        <th className="text-left px-4 py-2.5 font-semibold text-gray-500">Account Name</th>
                                                        <th className="text-left px-4 py-2.5 font-semibold text-gray-500">Narration</th>
                                                        <th className="text-right px-4 py-2.5 font-semibold text-gray-500">Debit (PKR)</th>
                                                        <th className="text-right px-4 py-2.5 font-semibold text-gray-500">Credit (PKR)</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-50">
                                                    {detailEntry.lines.map((line, li) => (
                                                        <tr key={li} className="hover:bg-blue-50/20">
                                                            <td className="px-4 py-2.5 font-mono font-semibold text-leads-blue">{line.accountCode}</td>
                                                            <td className="px-4 py-2.5 text-gray-700">{line.accountName}</td>
                                                            <td className="px-4 py-2.5 text-gray-400 italic">{line.narration || '—'}</td>
                                                            <td className="px-4 py-2.5 text-right font-mono">
                                                                {line.debit > 0 ? <span className="text-blue-700 font-semibold">{line.debit.toLocaleString('en-PK', { minimumFractionDigits: 2 })}</span> : <span className="text-gray-300">—</span>}
                                                            </td>
                                                            <td className="px-4 py-2.5 text-right font-mono">
                                                                {line.credit > 0 ? <span className="text-orange-700 font-semibold">{line.credit.toLocaleString('en-PK', { minimumFractionDigits: 2 })}</span> : <span className="text-gray-300">—</span>}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                                <tfoot className="bg-leads-blue/5 border-t border-gray-100">
                                                    <tr>
                                                        <td colSpan={3} className="px-4 py-2.5 font-bold text-xs text-gray-600">TOTALS</td>
                                                        <td className="px-4 py-2.5 text-right font-bold font-mono text-blue-700">{detailEntry.totalDebit.toLocaleString('en-PK', { minimumFractionDigits: 2 })}</td>
                                                        <td className="px-4 py-2.5 text-right font-bold font-mono text-orange-700">{detailEntry.totalCredit.toLocaleString('en-PK', { minimumFractionDigits: 2 })}</td>
                                                    </tr>
                                                </tfoot>
                                            </table>
                                        </div>

                                        {/* Double-entry check */}
                                        <div className={`mt-3 flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-lg ${detailEntry.totalDebit === detailEntry.totalCredit ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                                            {detailEntry.totalDebit === detailEntry.totalCredit
                                                ? '✓ Balanced — total debits equal total credits'
                                                : `⚠ Unbalanced — Debit ${detailEntry.totalDebit.toLocaleString('en-PK')} ≠ Credit ${detailEntry.totalCredit.toLocaleString('en-PK')}`
                                            }
                                        </div>
                                    </>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
