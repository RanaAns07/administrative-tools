'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Wallet as WalletIcon, CheckCircle2, Circle, Loader2, AlertCircle, Users, Check } from 'lucide-react';

export default function PayrollDisburseForm({ slips, wallets }: { slips: any[], wallets: any[] }) {
    const router = useRouter();
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [walletId, setWalletId] = useState(wallets[0]?._id || '');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const toggleAll = () => {
        if (selectedIds.size === slips.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(slips.map(s => s._id)));
        }
    };

    const toggleOne = (id: string) => {
        const next = new Set(selectedIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedIds(next);
    };

    const getMonthName = (m: number) => {
        const date = new Date();
        date.setMonth(m - 1);
        return date.toLocaleString('default', { month: 'long' });
    };

    const selectedSlips = slips.filter(s => selectedIds.has(s._id));
    const totalAmount = selectedSlips.reduce((sum, s) => sum + s.netPayable, 0);

    const handleDisburse = async () => {
        if (selectedIds.size === 0 || !walletId) return;
        setIsSubmitting(true);
        setError(null);
        setSuccessMessage(null);

        try {
            const res = await fetch('/api/finance/payroll/disburse', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    slipIds: Array.from(selectedIds),
                    walletId,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Disbursement failed');

            setSuccessMessage(`Successfully disbursed ${data.summary?.slipsDisbursed} salary slips.`);
            setSelectedIds(new Set());
            router.refresh();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (slips.length === 0 && !successMessage) {
        return (
            <div className="space-y-6 max-w-[1100px]">
                <div>
                    <span className="text-xs font-semibold text-leads-blue uppercase tracking-widest">HR & Payroll</span>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight mt-0.5">Disburse Salaries</h1>
                    <p className="text-sm text-gray-400">Pay approved salary slips to university staff.</p>
                </div>
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-16 text-center">
                    <CheckCircle2 size={48} className="text-emerald-400 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-semibold text-gray-900">All Caught Up!</p>
                    <p className="text-sm text-gray-500 mt-1">There are no pending DRAFT salary slips to disburse right now.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-[1100px]">
            <div>
                <span className="text-xs font-semibold text-leads-blue uppercase tracking-widest">HR & Payroll</span>
                <h1 className="text-2xl font-bold text-gray-900 tracking-tight mt-0.5">Disburse Salaries</h1>
                <p className="text-sm text-gray-400">Pay approved salary slips to university staff.</p>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-start gap-3">
                    <AlertCircle size={20} className="shrink-0 mt-0.5" />
                    <p className="text-sm">{error}</p>
                </div>
            )}

            {successMessage && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl flex items-start gap-3">
                    <Check size={20} className="shrink-0 mt-0.5" />
                    <p className="text-sm font-medium">{successMessage}</p>
                </div>
            )}

            {slips.length > 0 && (
                <div className="flex flex-col lg:flex-row gap-6 items-start">
                    {/* Main Table Area */}
                    <div className="flex-1 bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden min-w-0 w-full">
                        <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <h2 className="font-semibold text-gray-900 text-sm flex items-center gap-2">
                                <Users size={16} className="text-leads-blue" />
                                Pending Salary Slips
                            </h2>
                            <span className="text-xs font-medium text-gray-500 bg-gray-200 px-2 py-1 rounded-md">{slips.length} drafts</span>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-white border-b border-gray-100 shadow-sm relative z-10">
                                    <tr>
                                        <th className="px-4 py-3 text-left w-12 cursor-pointer" onClick={toggleAll}>
                                            {selectedIds.size === slips.length && slips.length > 0 ? (
                                                <CheckCircle2 size={18} className="text-leads-blue" />
                                            ) : (
                                                <Circle size={18} className="text-gray-300" />
                                            )}
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Staff Member</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Period</th>
                                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Net Payable</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {slips.map((s) => {
                                        const isSelected = selectedIds.has(s._id);
                                        return (
                                            <tr key={s._id} onClick={() => toggleOne(s._id)} className={`cursor-pointer transition-colors ${isSelected ? 'bg-blue-50/30' : 'hover:bg-gray-50'}`}>
                                                <td className="px-4 py-3.5">
                                                    {isSelected ? <CheckCircle2 size={18} className="text-leads-blue" /> : <Circle size={18} className="text-gray-300" />}
                                                </td>
                                                <td className="px-4 py-3.5">
                                                    <p className="font-bold text-gray-900">{s.staffId?.name}</p>
                                                    <p className="text-[10px] text-gray-500 uppercase tracking-wider mt-0.5">{s.staffId?.role || 'Staff'}</p>
                                                </td>
                                                <td className="px-4 py-3.5 text-gray-600">
                                                    {getMonthName(s.month)} {s.year}
                                                </td>
                                                <td className="px-4 py-3.5 text-right font-mono font-bold text-gray-900">
                                                    {s.netPayable.toLocaleString('en-PK')}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Action Panel */}
                    <div className="w-full lg:w-80 shrink-0 bg-white border border-gray-200 rounded-2xl shadow-sm p-5 sticky top-6">
                        <h3 className="font-bold text-gray-900 mb-4 border-b border-gray-100 pb-3">Disbursement Summary</h3>

                        <div className="space-y-3 mb-6">
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-500">Selected Slips</span>
                                <span className="font-bold text-gray-900">{selectedIds.size}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm mb-2">
                                <span className="text-gray-500">Total Amount</span>
                                <span className="font-bold text-rose-600">PKR {totalAmount.toLocaleString('en-PK')}</span>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Disburse From Wallet</label>
                                <select
                                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-leads-blue bg-white"
                                    value={walletId}
                                    onChange={(e) => setWalletId(e.target.value)}
                                >
                                    {wallets.map(w => (
                                        <option key={w._id} value={w._id}>{w.name} (PKR {w.currentBalance?.toLocaleString('en-PK')})</option>
                                    ))}
                                </select>
                            </div>

                            <button
                                onClick={handleDisburse}
                                disabled={isSubmitting || selectedIds.size === 0 || !walletId}
                                className="w-full bg-leads-blue hover:bg-blue-800 disabled:bg-gray-200 disabled:text-gray-400 text-white font-medium py-3 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-sm"
                            >
                                {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <WalletIcon size={16} />}
                                {isSubmitting ? 'Processing...' : `Pay PKR ${totalAmount.toLocaleString('en-PK')}`}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
