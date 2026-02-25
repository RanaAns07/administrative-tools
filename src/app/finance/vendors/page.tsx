'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Building2, Plus, Search, Loader2, X, Check, Globe, Phone, Mail } from 'lucide-react';

interface Vendor {
    _id: string; vendorCode: string; companyName: string; contactPerson: string;
    email: string; phone: string; ntn: string; vendorType: string; status: string;
    payableAccountCode: string; createdAt: string;
}

const typeColors: Record<string, string> = {
    SUPPLIER: 'bg-blue-100 text-blue-700',
    CONTRACTOR: 'bg-yellow-100 text-yellow-700',
    SERVICE_PROVIDER: 'bg-purple-100 text-purple-700',
    UTILITY: 'bg-orange-100 text-orange-700',
};

export default function VendorsPage() {
    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [form, setForm] = useState({
        companyName: '', contactPerson: '', email: '', phone: '', address: '',
        ntn: '', vendorType: 'SUPPLIER', payableAccountCode: '2001',
        paymentTermsDays: 30,
    });

    const fetchVendors = (q = '') => {
        setLoading(true);
        const qs = q ? `?search=${encodeURIComponent(q)}` : '';
        fetch(`/api/finance/vendors${qs}`)
            .then(r => r.json()).then(d => setVendors(Array.isArray(d) ? d : []))
            .finally(() => setLoading(false));
    };

    useEffect(() => { fetchVendors(); }, []);

    const handleSearch = () => fetchVendors(search);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault(); setSaving(true); setError(null);
        try {
            const res = await fetch('/api/finance/vendors', {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setShowModal(false); fetchVendors(search);
            setForm({ companyName: '', contactPerson: '', email: '', phone: '', address: '', ntn: '', vendorType: 'SUPPLIER', payableAccountCode: '2001', paymentTermsDays: 30 });
        } catch (err: any) { setError(err.message); }
        finally { setSaving(false); }
    };

    return (
        <div className="space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h1 className="text-xl font-bold text-leads-blue flex items-center gap-2"><Building2 size={22} /> Vendors</h1>
                    <p className="text-xs text-gray-500 mt-0.5">Accounts Payable supplier register · {vendors.length} shown</p>
                </div>
                <button onClick={() => setShowModal(true)} className="flex items-center gap-2 bg-leads-blue text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-800 shadow-sm">
                    <Plus size={16} /> Add Vendor
                </button>
            </div>

            {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm flex gap-2">{error} <button className="ml-auto" onClick={() => setError(null)}><X size={12} /></button></div>}

            <div className="flex gap-2">
                <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 text-gray-400" size={15} />
                    <input type="text" placeholder="Search name, NTN, type..." value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearch()}
                        className="pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-sm w-72 focus:outline-none focus:ring-1 focus:ring-leads-blue" />
                </div>
                <button onClick={handleSearch} className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200">Search</button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {loading ? <div className="col-span-3 py-16 text-center"><Loader2 className="animate-spin mx-auto text-gray-400" size={24} /></div>
                    : vendors.length === 0 ? (
                        <div className="col-span-3 bg-white rounded-xl border border-gray-200 py-16 text-center text-gray-400">
                            <Building2 size={40} className="mx-auto mb-3 opacity-30" />
                            <p className="text-sm">No vendors found. Add your first vendor to get started.</p>
                        </div>
                    ) : vendors.map((v, i) => (
                        <motion.div key={v._id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                            className="bg-white rounded-xl border border-gray-200 p-4 hover:border-leads-blue/30 hover:shadow-sm transition-all">
                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <p className="font-semibold text-gray-900 text-sm">{v.companyName}</p>
                                    <p className="text-xs font-mono text-leads-blue">{v.vendorCode}</p>
                                </div>
                                <div className="flex flex-col items-end gap-1">
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${typeColors[v.vendorType] || 'bg-gray-100 text-gray-600'}`}>{v.vendorType?.replace(/_/g, ' ')}</span>
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${v.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{v.status}</span>
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                {v.contactPerson && <p className="text-xs text-gray-600">👤 {v.contactPerson}</p>}
                                {v.phone && <p className="text-xs text-gray-400 flex items-center gap-1"><Phone size={11} /> {v.phone}</p>}
                                {v.email && <p className="text-xs text-gray-400 flex items-center gap-1"><Mail size={11} /> {v.email}</p>}
                                {v.ntn && <p className="text-xs text-gray-400">NTN: {v.ntn}</p>}
                            </div>
                            <div className="mt-3 pt-3 border-t border-gray-50 text-[10px] text-gray-400 flex justify-between">
                                <span>AP A/c: <span className="font-mono text-leads-blue">{v.payableAccountCode}</span></span>
                                <span>Added {new Date(v.createdAt).toLocaleDateString('en-PK')}</span>
                            </div>
                        </motion.div>
                    ))}
            </div>

            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm overflow-y-auto">
                    <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                        className="bg-white rounded-2xl shadow-2xl w-full max-w-md my-4">
                        <div className="flex justify-between items-center p-5 border-b border-gray-100">
                            <h2 className="font-bold text-leads-blue">Add Vendor</h2>
                            <button onClick={() => setShowModal(false)}><X size={18} className="text-gray-400" /></button>
                        </div>
                        <form onSubmit={handleCreate} className="p-5 space-y-3">
                            <div>
                                <label className="text-xs font-semibold text-gray-600 mb-1 block">Company Name *</label>
                                <input required value={form.companyName} onChange={e => setForm({ ...form, companyName: e.target.value })}
                                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-leads-blue" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-semibold text-gray-600 mb-1 block">Contact Person</label>
                                    <input value={form.contactPerson} onChange={e => setForm({ ...form, contactPerson: e.target.value })}
                                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-leads-blue" />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-gray-600 mb-1 block">Type *</label>
                                    <select required value={form.vendorType} onChange={e => setForm({ ...form, vendorType: e.target.value })}
                                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-leads-blue">
                                        {['SUPPLIER', 'CONTRACTOR', 'SERVICE_PROVIDER', 'UTILITY'].map(t => <option key={t}>{t}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-semibold text-gray-600 mb-1 block">Phone</label>
                                    <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
                                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-leads-blue" placeholder="0300-0000000" />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-gray-600 mb-1 block">Email</label>
                                    <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-leads-blue" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-semibold text-gray-600 mb-1 block">NTN</label>
                                    <input value={form.ntn} onChange={e => setForm({ ...form, ntn: e.target.value })}
                                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-leads-blue" placeholder="0000000-1" />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-gray-600 mb-1 block">Payment Terms (days)</label>
                                    <input type="number" min="1" value={form.paymentTermsDays} onChange={e => setForm({ ...form, paymentTermsDays: parseInt(e.target.value) || 30 })}
                                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-leads-blue" />
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-gray-600 mb-1 block">AP Account Code *</label>
                                <input required value={form.payableAccountCode} onChange={e => setForm({ ...form, payableAccountCode: e.target.value })}
                                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-leads-blue" placeholder="2001" />
                            </div>
                            {error && <p className="text-red-600 text-xs bg-red-50 rounded px-3 py-2">{error}</p>}
                            <div className="flex gap-3 pt-1">
                                <button type="button" onClick={() => setShowModal(false)} className="flex-1 border border-gray-200 rounded-lg py-2 text-sm">Cancel</button>
                                <button type="submit" disabled={saving} className="flex-1 bg-leads-blue text-white rounded-lg py-2 text-sm font-medium hover:bg-blue-800 flex items-center justify-center gap-2">
                                    {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Add Vendor
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}
        </div>
    );
}
