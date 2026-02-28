'use client';

import { useState } from 'react';
import { Search, Loader2, User, FileText, Activity, RefreshCw } from 'lucide-react';

function formatPKR(n: number = 0) {
    return new Intl.NumberFormat('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
}

export default function StudentFeesClient() {
    const [search, setSearch] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [students, setStudents] = useState<any[]>([]);
    const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
    const [studentProfile, setStudentProfile] = useState<any | null>(null);
    const [isLoadingProfile, setIsLoadingProfile] = useState(false);

    const handleSearch = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!search.trim()) return;

        setIsSearching(true);
        setStudentProfile(null);
        setSelectedStudentId(null);
        try {
            const res = await fetch(`/api/finance/university/students?search=${encodeURIComponent(search)}`);
            if (res.ok) {
                const data = await res.json();
                setStudents(data);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsSearching(false);
        }
    };

    const loadProfile = async (id: string) => {
        setSelectedStudentId(id);
        setIsLoadingProfile(true);
        try {
            const res = await fetch(`/api/finance/university/students/${id}`);
            if (res.ok) {
                const data = await res.json();
                setStudentProfile(data);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoadingProfile(false);
        }
    };

    return (
        <div className="flex flex-col md:flex-row gap-6">
            {/* Left Sidebar: Search & List */}
            <div className="w-full md:w-1/3 space-y-4">
                <form onSubmit={handleSearch} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-3 text-gray-400" size={16} />
                        <input
                            type="text"
                            placeholder="Name or Reg No..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-leads-blue transition-all"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={isSearching || !search.trim()}
                        className="bg-leads-blue hover:bg-blue-800 text-white px-4 rounded-xl disabled:opacity-50 transition-colors flex items-center justify-center"
                    >
                        {isSearching ? <Loader2 size={16} className="animate-spin" /> : 'Find'}
                    </button>
                </form>

                {students.length > 0 && (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden divide-y divide-gray-50">
                        {students.map(s => (
                            <div
                                key={s._id}
                                onClick={() => loadProfile(s._id)}
                                className={`p-4 cursor-pointer transition-colors ${selectedStudentId === s._id ? 'bg-blue-50/50 border-l-4 border-l-leads-blue' : 'hover:bg-gray-50 border-l-4 border-l-transparent'}`}
                            >
                                <p className="font-semibold text-gray-900 text-sm">{s.name}</p>
                                <p className="font-mono text-xs text-gray-500 mt-0.5">{s.registrationNumber}</p>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Right Main Content: Profile Details */}
            <div className="w-full md:w-2/3">
                {!selectedStudentId ? (
                    <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center shadow-sm">
                        <User size={48} className="mx-auto text-gray-200 mb-4" />
                        <h3 className="text-gray-500 font-medium">Select a student</h3>
                        <p className="text-sm text-gray-400 mt-1">Search and click on a student to view their financial profile.</p>
                    </div>
                ) : isLoadingProfile ? (
                    <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center shadow-sm">
                        <Loader2 size={32} className="mx-auto text-leads-blue animate-spin mb-4" />
                        <p className="text-gray-500 text-sm">Loading profile data...</p>
                    </div>
                ) : studentProfile ? (
                    <div className="space-y-6">
                        {/* Summary Header */}
                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-10">
                                <User size={100} />
                            </div>
                            <div className="relative">
                                <h2 className="text-2xl font-bold text-gray-900">{studentProfile.name}</h2>
                                <p className="text-sm font-mono text-gray-500 mt-1">{studentProfile.registrationNumber}</p>
                                <div className="mt-4 flex gap-6 text-sm">
                                    <div className="bg-gray-50 px-4 py-2 rounded-lg border border-gray-100">
                                        <span className="text-xs text-gray-400 uppercase tracking-wide block mb-0.5">Semester</span>
                                        <span className="font-semibold">{studentProfile.currentSemester}</span>
                                    </div>
                                    <div className="bg-gray-50 px-4 py-2 rounded-lg border border-gray-100">
                                        <span className="text-xs text-gray-400 uppercase tracking-wide block mb-0.5">Batch</span>
                                        <span className="font-semibold">{studentProfile.batchId?.name || 'N/A'}</span>
                                    </div>
                                    <div className="bg-blue-50 px-4 py-2 rounded-lg border border-blue-100">
                                        <span className="text-xs text-blue-400 uppercase tracking-wide block mb-0.5">Advance Balance</span>
                                        <span className="font-bold text-leads-blue">PKR {formatPKR(studentProfile.advanceBalance)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Recent Invoices */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
                                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                                    <FileText size={16} className="text-leads-blue" /> Invoices
                                </h3>
                                <span className="text-xs font-semibold bg-gray-100 text-gray-600 px-2 py-1 rounded-full">{studentProfile.invoices?.length || 0} Total</span>
                            </div>
                            <div className="divide-y divide-gray-50">
                                {!studentProfile.invoices?.length ? (
                                    <p className="p-6 text-center text-sm text-gray-500">No invoices issued.</p>
                                ) : studentProfile.invoices.map((inv: any) => (
                                    <div key={inv._id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                        <div>
                                            <p className="text-xs text-gray-400 font-mono mb-1">{inv._id}</p>
                                            <div className="flex items-center gap-3">
                                                <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full
                                                    ${inv.status === 'PAID' ? 'bg-green-100 text-green-700' :
                                                        inv.status === 'PARTIAL' ? 'bg-blue-100 text-blue-700' :
                                                            inv.status === 'OVERDUE' ? 'bg-red-100 text-red-700' :
                                                                'bg-orange-100 text-orange-700'}
                                                `}>
                                                    {inv.status}
                                                </span>
                                                <span className="text-sm text-gray-500 font-medium">Due: {new Date(inv.dueDate).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                        <div className="text-right flex items-center gap-6">
                                            <div>
                                                <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-0.5">Total</p>
                                                <p className="text-sm font-semibold text-gray-700">PKR {formatPKR(inv.totalAmount - inv.discountAmount)}</p>
                                            </div>
                                            <div className="w-px h-8 bg-gray-100"></div>
                                            <div>
                                                <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-0.5">Arrears</p>
                                                <p className={`text-sm font-bold ${inv.arrears > 0 ? 'text-red-600' : 'text-emerald-600'}`}>PKR {formatPKR(inv.arrears)}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Recent Refunds */}
                        {studentProfile.refunds?.length > 0 && (
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                                <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
                                    <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                                        <RefreshCw size={16} className="text-emerald-600" /> Processed Refunds
                                    </h3>
                                </div>
                                <div className="divide-y divide-gray-50">
                                    {studentProfile.refunds.map((ref: any) => (
                                        <div key={ref._id} className="p-4 flex items-center justify-between">
                                            <div>
                                                <p className="text-sm font-semibold text-gray-900">{ref.refundType.replace(/_/g, ' ')}</p>
                                                <p className="text-xs text-gray-500 font-mono mt-0.5">{ref.refundNumber} • {new Date(ref.processedAt).toLocaleDateString()}</p>
                                            </div>
                                            <span className="font-bold text-gray-900">PKR {formatPKR(ref.amount)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                ) : null}
            </div>
        </div>
    );
}
