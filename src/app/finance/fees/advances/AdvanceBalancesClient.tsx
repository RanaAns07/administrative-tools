'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState } from 'react';
import { Coins, Search } from 'lucide-react';

export default function AdvanceBalancesClient({ initialBalances }: { initialBalances: any[] }) {
    const [search, setSearch] = useState('');

    const filtered = initialBalances.filter(b =>
        b.studentId?.toLowerCase().includes(search.toLowerCase()) ||
        b.studentName?.toLowerCase().includes(search.toLowerCase())
    );

    const totalAdvances = initialBalances.reduce((s, b) => s + (b.balance || 0), 0);

    return (
        <div className="space-y-4">
            <div className="bg-indigo-50 rounded-2xl p-5 border border-indigo-100 flex items-center justify-between">
                <div>
                    <p className="text-xs font-medium text-indigo-400 uppercase tracking-wider">Total Advance Funds Held</p>
                    <p className="text-3xl font-bold text-indigo-700 mt-1">PKR {totalAdvances.toLocaleString('en-PK')}</p>
                </div>
                <div className="p-3 bg-indigo-100 rounded-xl">
                    <Coins className="text-indigo-600" size={24} />
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-4 sm:p-6 border-b border-gray-100">
                    <div className="relative">
                        <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
                        <input type="text" placeholder="Search by student..." value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm w-64 focus:outline-none focus:ring-2 focus:ring-leads-blue" />
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-gray-50 text-gray-500 text-xs font-semibold uppercase border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-3">Student</th>
                                <th className="px-6 py-3">Student ID</th>
                                <th className="px-6 py-3 text-right">Advance Balance</th>
                                <th className="px-6 py-3">Last Updated</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {filtered.length === 0 ? (
                                <tr><td colSpan={4} className="py-16 text-center text-gray-400">
                                    <Coins className="mx-auto mb-2 text-gray-200" size={32} />
                                    {search ? 'No matching students found.' : 'No advance balances on record. Excess fee payments will appear here automatically.'}
                                </td></tr>
                            ) : filtered.map(b => (
                                <tr key={b._id} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="px-6 py-4 font-semibold text-gray-900">{b.studentName || '—'}</td>
                                    <td className="px-6 py-4 font-mono text-xs text-gray-500">{b.studentId}</td>
                                    <td className="px-6 py-4 text-right">
                                        <span className="font-mono font-bold text-emerald-700 text-base">PKR {(b.balance || 0).toLocaleString('en-PK')}</span>
                                    </td>
                                    <td className="px-6 py-4 text-xs text-gray-400">
                                        {b.updatedAt ? new Date(b.updatedAt).toLocaleDateString('en-PK', { dateStyle: 'medium' }) : '—'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
