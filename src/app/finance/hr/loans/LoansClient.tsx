'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState } from 'react';
import { Search, Plus, Loader2, Landmark, Wallet as WalletIcon } from 'lucide-react';

export default function LoansClient({
    initialLoans, staff, wallets
}: { initialLoans: any[], staff: any[], wallets: any[] }) {
    const [loans, setLoans] = useState<any[]>(initialLoans);
    const [search, setSearch] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const [formData, setFormData] = useState({
        staffId: '',
        loanType: 'ADVANCE',
        amount: '',
        monthlyInstallment: '',
        walletId: wallets[0]?._id || '',
        notes: ''
    });

    const set = (k: string, v: string) => setFormData(f => ({ ...f, [k]: v }));

    const filtered = loans.filter(l =>
        l.loanNumber?.toLowerCase().includes(search.toLowerCase()) ||
        l.staffId?.name?.toLowerCase().includes(search.toLowerCase())
    );

    const handleSubmit = async (ev: React.FormEvent) => {
        ev.preventDefault();
        setLoading(true); setError('');
        try {
            const res = await fetch('/api/finance/hr/loans', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    amount: parseFloat(formData.amount),
                    monthlyInstallment: parseFloat(formData.monthlyInstallment)
                })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to issue loan');

            setLoans([data, ...loans]);
            setIsModalOpen(false);
            setFormData(prev => ({ ...prev, staffId: '', amount: '', monthlyInstallment: '', notes: '' }));
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-4 sm:p-6 border-b border-gray-100 flex flex-col sm:flex-row gap-4 justify-between bg-gray-50">
                <div className="relative w-full sm:w-80">
                    <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
                    <input type="text" placeholder="Search by name or LN- ref..." value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm w-full focus:outline-none focus:ring-2 focus:ring-leads-blue"
                    />
                </div>
                <button onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-2 bg-leads-blue text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-800 transition-colors">
                    <Plus size={16} /> Issue Loan/Advance
                </button>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-white border-b border-gray-100 text-gray-500 text-xs font-semibold uppercase tracking-wider">
                        <tr>
                            <th className="px-6 py-4">Reference</th>
                            <th className="px-6 py-4">Staff Member</th>
                            <th className="px-6 py-4">Type</th>
                            <th className="px-6 py-4 text-right">Amount Disbursed</th>
                            <th className="px-6 py-4 text-right">Remaining Balance</th>
                            <th className="px-6 py-4">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 bg-white">
                        {filtered.length === 0 ? (
                            <tr><td colSpan={6} className="py-16 text-center text-gray-400">
                                <Landmark className="mx-auto mb-2 text-gray-200" size={32} />
                                No loans or advances found.
                            </td></tr>
                        ) : filtered.map((loan) => (
                            <tr key={loan._id} className="hover:bg-gray-50/50 transition-colors">
                                <td className="px-6 py-4">
                                    <p className="font-semibold text-gray-900">{loan.loanNumber}</p>
                                    <p className="text-xs text-gray-400">{new Date(loan.disbursedDate).toLocaleDateString()}</p>
                                </td>
                                <td className="px-6 py-4">
                                    <p className="font-semibold text-gray-900">{loan.staffId?.name}</p>
                                    <p className="text-xs text-gray-400">{loan.staffId?.department}</p>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`text-xs px-2 py-1 border rounded font-semibold tracking-wide ${loan.loanType === 'ADVANCE' ? 'bg-indigo-50 text-indigo-700 border-indigo-100' : 'bg-purple-50 text-purple-700 border-purple-100'
                                        }`}>
                                        {loan.loanType}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <p className="font-mono text-gray-600">PKR {loan.amount?.toLocaleString()}</p>
                                    <p className="text-xs text-gray-400 mt-0.5" title={loan.walletId?.name}>
                                        <WalletIcon size={12} className="inline mr-1" />{loan.walletId?.name?.slice(0, 10)}...
                                    </p>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <p className="font-mono font-bold text-gray-900">
                                        PKR {loan.remainingBalance?.toLocaleString()}
                                    </p>
                                    <p className="text-xs text-gray-400 mt-0.5">
                                        Deduct {loan.monthlyInstallment?.toLocaleString()}/mo
                                    </p>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`text-xs px-2.5 py-1 rounded-full font-semibold border ${loan.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                            : loan.status === 'REPAID' ? 'bg-gray-100 text-gray-600 border-gray-200'
                                                : 'bg-rose-50 text-rose-700 border-rose-100'
                                        }`}>
                                        {loan.status}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col">
                        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                            <h3 className="font-bold text-gray-900">Issue Loan/Advance</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                                <Plus size={20} className="rotate-45" />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            {error && <div className="p-3 bg-rose-50 text-rose-600 rounded-lg text-sm border border-rose-100">{error}</div>}

                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">Staff Member *</label>
                                <select required value={formData.staffId} onChange={e => set('staffId', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-leads-blue">
                                    <option value="">-- Select Staff --</option>
                                    {staff.map(s => <option key={s._id} value={s._id}>{s.name} ({s.department})</option>)}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">Type</label>
                                    <select required value={formData.loanType} onChange={e => set('loanType', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-leads-blue">
                                        <option value="ADVANCE">Advance Salary</option>
                                        <option value="LOAN">Long Term Loan</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">Disburse From Wallet</label>
                                    <select required value={formData.walletId} onChange={e => set('walletId', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-leads-blue">
                                        {wallets.map(w => <option key={w._id} value={w._id}>{w.name}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">Total Amount *</label>
                                    <input required type="number" min="0" step="0.01" value={formData.amount} onChange={e => set('amount', e.target.value)}
                                        placeholder="e.g. 50000" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-leads-blue" />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">Monthly Deduction *</label>
                                    <input required type="number" min="0" step="0.01" value={formData.monthlyInstallment} onChange={e => set('monthlyInstallment', e.target.value)}
                                        placeholder="e.g. 5000" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-leads-blue" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">Notes (Optional)</label>
                                <textarea value={formData.notes} onChange={e => set('notes', e.target.value)} rows={2}
                                    placeholder="Reason for loan/advance..."
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-leads-blue" />
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg">Cancel</button>
                                <button type="submit" disabled={loading} className="px-5 py-2 text-sm font-bold text-white bg-leads-blue hover:bg-blue-800 rounded-lg flex items-center gap-2">
                                    {loading ? <Loader2 size={15} className="animate-spin" /> : 'Issue'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
