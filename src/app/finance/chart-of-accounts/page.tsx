'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Search, ChevronRight, Scale, Loader2, X, Check } from 'lucide-react';

interface CoA {
    _id: string;
    accountCode: string;
    accountName: string;
    accountType: string;
    accountSubType: string;
    isControl: boolean;
    isActive: boolean;
    openingBalance: number;
    level: number;
}

const typeColors: Record<string, string> = {
    ASSET: 'bg-blue-100 text-blue-700',
    LIABILITY: 'bg-orange-100 text-orange-700',
    EQUITY: 'bg-purple-100 text-purple-700',
    REVENUE: 'bg-green-100 text-green-700',
    EXPENSE: 'bg-red-100 text-red-700',
};

export default function ChartOfAccountsPage() {
    const [accounts, setAccounts] = useState<CoA[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterType, setFilterType] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    const [form, setForm] = useState({
        accountCode: '', accountName: '', accountType: 'ASSET',
        accountSubType: 'CURRENT_ASSET', level: 3, isControl: false,
        description: '', openingBalance: 0,
    });

    const fetchAccounts = () => {
        setLoading(true);
        fetch('/api/finance/chart-of-accounts?active=true')
            .then((r) => r.json())
            .then(setAccounts)
            .catch((e) => setError(e.message))
            .finally(() => setLoading(false));
    };

    useEffect(() => { fetchAccounts(); }, []);

    const filtered = accounts.filter((a) => {
        const q = search.toLowerCase();
        const matchSearch = !q || a.accountCode.toLowerCase().includes(q) || a.accountName.toLowerCase().includes(q);
        const matchType = !filterType || a.accountType === filterType;
        return matchSearch && matchType;
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError(null);
        try {
            const res = await fetch('/api/finance/chart-of-accounts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setShowModal(false);
            fetchAccounts();
            setForm({ accountCode: '', accountName: '', accountType: 'ASSET', accountSubType: 'CURRENT_ASSET', level: 3, isControl: false, description: '', openingBalance: 0 });
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    const subtypeByType: Record<string, string[]> = {
        ASSET: ['CURRENT_ASSET', 'NON_CURRENT_ASSET'],
        LIABILITY: ['CURRENT_LIABILITY', 'NON_CURRENT_LIABILITY'],
        EQUITY: ['RETAINED_EARNINGS', 'SHARE_CAPITAL', 'GENERAL'],
        REVENUE: ['OPERATING_REVENUE', 'NON_OPERATING_REVENUE', 'GENERAL'],
        EXPENSE: ['COST_OF_SERVICES', 'OPERATING_EXPENSE', 'NON_OPERATING_EXPENSE', 'GENERAL'],
    };

    return (
        <div className="space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h1 className="text-xl font-bold text-leads-blue flex items-center gap-2">
                        <Scale size={22} /> Chart of Accounts
                    </h1>
                    <p className="text-xs text-gray-500 mt-0.5">Hierarchical account structure · {accounts.length} accounts</p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="flex items-center gap-2 bg-leads-blue text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-800 transition-colors shadow-sm"
                >
                    <Plus size={16} /> New Account
                </button>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm flex gap-2 items-center">
                    <X size={16} /> {error}
                    <button onClick={() => setError(null)} className="ml-auto"><X size={14} /></button>
                </div>
            )}

            {/* Filters */}
            <div className="flex flex-wrap gap-3">
                <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 text-gray-400" size={15} />
                    <input
                        type="text"
                        placeholder="Search code or name..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-sm w-60 focus:outline-none focus:ring-1 focus:ring-leads-blue"
                    />
                </div>
                <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-leads-blue"
                >
                    <option value="">All Types</option>
                    {['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE'].map((t) => (
                        <option key={t}>{t}</option>
                    ))}
                </select>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 border-b border-gray-100 text-xs uppercase text-gray-500 font-semibold tracking-wider">
                            <tr>
                                <th className="px-4 py-3">Code</th>
                                <th className="px-4 py-3">Account Name</th>
                                <th className="px-4 py-3">Type</th>
                                <th className="px-4 py-3">Sub-Type</th>
                                <th className="px-4 py-3 text-right">Opening Balance</th>
                                <th className="px-4 py-3 text-center">Level</th>
                                <th className="px-4 py-3 text-center">Control</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {loading ? (
                                <tr><td colSpan={7} className="py-12 text-center text-gray-400">
                                    <Loader2 className="animate-spin mx-auto mb-2" size={24} />
                                    Loading accounts...
                                </td></tr>
                            ) : filtered.length === 0 ? (
                                <tr><td colSpan={7} className="py-10 text-center text-gray-400 text-sm">No accounts found. Create your Chart of Accounts to get started.</td></tr>
                            ) : (
                                filtered.map((a, i) => (
                                    <motion.tr
                                        key={a._id}
                                        initial={{ opacity: 0, y: 6 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: i * 0.03 }}
                                        className="hover:bg-blue-50/30 transition-colors"
                                    >
                                        <td className="px-4 py-3 font-mono text-xs font-semibold text-leads-blue">{a.accountCode}</td>
                                        <td className="px-4 py-3 font-medium text-gray-800">
                                            <span style={{ marginLeft: `${(a.level - 1) * 12}px` }} className="flex items-center gap-1">
                                                {a.level > 1 && <ChevronRight size={12} className="text-gray-400" />}
                                                {a.accountName}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${typeColors[a.accountType]}`}>
                                                {a.accountType}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-xs text-gray-500">{a.accountSubType?.replace(/_/g, ' ') || ''}</td>
                                        <td className="px-4 py-3 text-right font-mono text-xs text-gray-700">
                                            {a.openingBalance.toLocaleString('en-PK', { minimumFractionDigits: 2 })}
                                        </td>
                                        <td className="px-4 py-3 text-center text-xs text-gray-500">{a.level}</td>
                                        <td className="px-4 py-3 text-center">
                                            {a.isControl ? <Check size={14} className="text-green-500 mx-auto" /> : <span className="text-gray-300">—</span>}
                                        </td>
                                    </motion.tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Create Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg"
                    >
                        <div className="flex justify-between items-center p-5 border-b border-gray-100">
                            <h2 className="font-bold text-leads-blue">New Account</h2>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-5 space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-semibold text-gray-600 mb-1 block">Account Code *</label>
                                    <input required value={form.accountCode} onChange={(e) => setForm({ ...form, accountCode: e.target.value })}
                                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-leads-blue"
                                        placeholder="e.g. 1001" />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-gray-600 mb-1 block">Level</label>
                                    <select value={form.level} onChange={(e) => setForm({ ...form, level: parseInt(e.target.value) })}
                                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-leads-blue">
                                        {[1, 2, 3, 4, 5].map(l => <option key={l}>{l}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-gray-600 mb-1 block">Account Name *</label>
                                <input required value={form.accountName} onChange={(e) => setForm({ ...form, accountName: e.target.value })}
                                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-leads-blue"
                                    placeholder="e.g. Cash in Hand" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-semibold text-gray-600 mb-1 block">Account Type *</label>
                                    <select value={form.accountType} onChange={(e) => setForm({ ...form, accountType: e.target.value, accountSubType: subtypeByType[e.target.value][0] })}
                                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-leads-blue">
                                        {['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE'].map(t => <option key={t}>{t}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-gray-600 mb-1 block">Sub-Type *</label>
                                    <select value={form.accountSubType} onChange={(e) => setForm({ ...form, accountSubType: e.target.value })}
                                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-leads-blue">
                                        {(subtypeByType[form.accountType] || []).map(s => <option key={s}>{s.replace(/_/g, ' ')}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-semibold text-gray-600 mb-1 block">Opening Balance (PKR)</label>
                                    <input type="number" step="0.01" value={form.openingBalance} onChange={(e) => setForm({ ...form, openingBalance: parseFloat(e.target.value) || 0 })}
                                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-leads-blue" />
                                </div>
                                <div className="flex items-end pb-2">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="checkbox" checked={form.isControl} onChange={(e) => setForm({ ...form, isControl: e.target.checked })}
                                            className="w-4 h-4 rounded border-gray-300 text-leads-blue" />
                                        <span className="text-xs font-semibold text-gray-600">Control Account</span>
                                    </label>
                                </div>
                            </div>
                            {error && <div className="text-red-600 text-xs bg-red-50 rounded-lg px-3 py-2">{error}</div>}
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setShowModal(false)}
                                    className="flex-1 border border-gray-200 rounded-lg py-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                                    Cancel
                                </button>
                                <button type="submit" disabled={saving}
                                    className="flex-1 bg-leads-blue text-white rounded-lg py-2 text-sm font-medium hover:bg-blue-800 transition-colors flex items-center justify-center gap-2">
                                    {saving ? <><Loader2 size={14} className="animate-spin" /> Saving...</> : <><Check size={14} /> Create Account</>}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}
        </div>
    );
}
