'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState } from 'react';
import { GraduationCap, Search } from 'lucide-react';

const CATEGORY_COLORS: Record<string, string> = {
    MERIT: 'bg-indigo-50 text-indigo-700',
    NEED_BASED: 'bg-amber-50 text-amber-700',
    SPORTS: 'bg-emerald-50 text-emerald-700',
    STAFF_DEPENDENT: 'bg-blue-50 text-blue-700',
    HAFIZ_E_QURAN: 'bg-teal-50 text-teal-700',
    SIBLING: 'bg-violet-50 text-violet-700',
    GOVERNMENT: 'bg-rose-50 text-rose-700',
    OTHER: 'bg-gray-100 text-gray-600',
};

export default function ScholarshipsClient({ initialScholarships }: { initialScholarships: any[] }) {
    const [search, setSearch] = useState('');

    const filtered = initialScholarships.filter(s =>
        s.name?.toLowerCase().includes(search.toLowerCase()) ||
        s.category?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-4 sm:p-6 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="relative">
                    <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
                    <input type="text" placeholder="Search scholarships..." value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm w-64 focus:outline-none focus:ring-2 focus:ring-leads-blue"
                    />
                </div>
                <span className="text-sm text-gray-500 font-medium">{filtered.length} records</span>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-gray-50 text-gray-500 text-xs font-semibold uppercase border-b border-gray-100">
                        <tr>
                            <th className="px-6 py-3">Scholarship Name</th>
                            <th className="px-6 py-3">Category</th>
                            <th className="px-6 py-3">Discount</th>
                            <th className="px-6 py-3">Semesters</th>
                            <th className="px-6 py-3">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {filtered.length === 0 ? (
                            <tr><td colSpan={5} className="py-16 text-center text-gray-400">
                                <GraduationCap className="mx-auto mb-2 text-gray-200" size={32} />
                                No scholarships found.
                            </td></tr>
                        ) : filtered.map(s => (
                            <tr key={s._id} className="hover:bg-gray-50/50 transition-colors">
                                <td className="px-6 py-4 font-semibold text-gray-900">{s.name}</td>
                                <td className="px-6 py-4">
                                    <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${CATEGORY_COLORS[s.category] || 'bg-gray-100 text-gray-600'}`}>
                                        {s.category?.replace(/_/g, ' ')}
                                    </span>
                                </td>
                                <td className="px-6 py-4 font-mono font-bold text-gray-900">
                                    {s.discountType === 'PERCENTAGE' ? `${s.discountValue}%` : `PKR ${(s.discountValue || 0).toLocaleString('en-PK')}`}
                                </td>
                                <td className="px-6 py-4 text-xs text-gray-500">Sem {s.validFromSemester} – {s.validToSemester}</td>
                                <td className="px-6 py-4">
                                    <span className={`text-xs px-2.5 py-1 rounded-full font-semibold border ${s.isActive ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                                        {s.isActive ? 'Active' : 'Inactive'}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
