'use client';

import { useState } from 'react';
import { Plus, Search, Loader2, Edit, Trash2, CheckCircle2, XCircle } from 'lucide-react';
import RoleGuard from '../../_components/RoleGuard';

export default function VendorsClient({ initialVendors }: { initialVendors: any[] }) {
    const [vendors, setVendors] = useState(initialVendors);
    const [search, setSearch] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Form state
    const [formData, setFormData] = useState({
        companyName: '', contactPerson: '', phone: '', email: '',
        ntn: '', strn: '', payableAccountCode: '2101-001', // Default AP code
        isGSTRegistered: false, paymentTermsDays: 30
    });

    const filtered = vendors.filter(v =>
        v.companyName.toLowerCase().includes(search.toLowerCase()) ||
        v.vendorCode.toLowerCase().includes(search.toLowerCase())
    );

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true); setError('');

        try {
            const res = await fetch('/api/finance/vendors', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to create vendor');

            setVendors([...vendors, data].sort((a, b) => a.companyName.localeCompare(b.companyName)));
            setIsModalOpen(false);
            setFormData({
                companyName: '', contactPerson: '', phone: '', email: '',
                ntn: '', strn: '', payableAccountCode: '2101-001',
                isGSTRegistered: false, paymentTermsDays: 30
            });
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-4 sm:p-6 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="relative">
                    <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
                    <input
                        type="text"
                        placeholder="Search vendors..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm w-full sm:w-72 focus:outline-none focus:ring-2 focus:ring-leads-blue"
                    />
                </div>
                <RoleGuard>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center gap-2 bg-leads-blue text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-800 transition-colors"
                    >
                        <Plus size={16} /> Add Vendor
                    </button>
                </RoleGuard>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-gray-50 border-b border-gray-100 text-gray-500 font-medium">
                        <tr>
                            <th className="px-6 py-3">Vendor Code</th>
                            <th className="px-6 py-3">Company Details</th>
                            <th className="px-6 py-3">Tax & Terms</th>
                            <th className="px-6 py-3">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {filtered.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="py-12 text-center text-gray-500">
                                    No vendors found. {search ? 'Try a different search term.' : 'Click "Add Vendor" to create one.'}
                                </td>
                            </tr>
                        ) : (
                            filtered.map(v => (
                                <tr key={v._id} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <span className="font-mono text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">{v.vendorCode}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <p className="font-bold text-gray-900">{v.companyName}</p>
                                        <p className="text-xs text-gray-500 mt-0.5">{v.contactPerson || 'No contact'} · {v.phone || 'No phone'}</p>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col gap-1 text-xs text-gray-500">
                                            <span className="flex items-center gap-1">
                                                {v.isGSTRegistered ? <CheckCircle2 size={12} className="text-emerald-500" /> : <XCircle size={12} className="text-gray-300" />}
                                                GST {v.isGSTRegistered ? `(STRN: ${v.strn})` : 'Unregistered'}
                                            </span>
                                            {v.ntn && <span>NTN: {v.ntn}</span>}
                                            <span>Terms: Net {v.paymentTermsDays}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${v.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-rose-50 text-rose-700 border-rose-100'}`}>
                                            {v.status}
                                        </span>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                            <h3 className="font-bold text-gray-900">Add New Vendor</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 bg-white p-1 rounded-full shadow-sm">
                                <Plus size={18} className="rotate-45" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                            {error && <div className="p-3 bg-rose-50 text-rose-600 rounded-lg text-sm border border-rose-100">{error}</div>}

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="col-span-1 sm:col-span-2">
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">Company / Vendor Name *</label>
                                    <input
                                        required value={formData.companyName} onChange={e => setFormData({ ...formData, companyName: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-leads-blue text-sm"
                                        placeholder="E.g. Tech Supplies Co."
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">Contact Person</label>
                                    <input
                                        value={formData.contactPerson} onChange={e => setFormData({ ...formData, contactPerson: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-leads-blue text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">Phone Number</label>
                                    <input
                                        value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-leads-blue text-sm"
                                    />
                                </div>

                                <div className="col-span-1 sm:col-span-2 pt-2 border-t border-gray-100">
                                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Tax & Accounting</h4>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">NTN (National Tax No.)</label>
                                    <input
                                        value={formData.ntn} onChange={e => setFormData({ ...formData, ntn: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-leads-blue text-sm font-mono placeholder:font-sans"
                                        placeholder="Optional"
                                    />
                                </div>
                                <div className="flex items-end mb-2">
                                    <label className="flex items-center gap-2 cursor-pointer bg-gray-50 px-3 py-2 border border-gray-200 rounded-lg w-full">
                                        <input
                                            type="checkbox" checked={formData.isGSTRegistered} onChange={e => setFormData({ ...formData, isGSTRegistered: e.target.checked })}
                                            className="rounded text-leads-blue focus:ring-leads-blue"
                                        />
                                        <span className="text-sm font-medium text-gray-700">GST Registered</span>
                                    </label>
                                </div>

                                {formData.isGSTRegistered && (
                                    <div className="col-span-1 sm:col-span-2">
                                        <label className="block text-xs font-semibold text-gray-700 mb-1">STRN (Sales Tax Reg.)</label>
                                        <input
                                            required={formData.isGSTRegistered} value={formData.strn} onChange={e => setFormData({ ...formData, strn: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-leads-blue text-sm font-mono placeholder:font-sans"
                                            placeholder="Tax number"
                                        />
                                    </div>
                                )}

                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">Payment Terms (Days)</label>
                                    <input
                                        type="number" min="0" required value={formData.paymentTermsDays} onChange={e => setFormData({ ...formData, paymentTermsDays: parseInt(e.target.value) || 0 })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-leads-blue text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">Payable AP Account</label>
                                    <input
                                        required value={formData.payableAccountCode} onChange={e => setFormData({ ...formData, payableAccountCode: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-leads-blue text-sm font-mono bg-gray-50"
                                        placeholder="2101-001"
                                    />
                                </div>
                            </div>

                            <div className="pt-4 border-t border-gray-100 flex justify-end gap-3">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                                    Cancel
                                </button>
                                <button type="submit" disabled={loading} className="px-5 py-2 text-sm font-bold text-white bg-leads-blue hover:bg-blue-800 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50">
                                    {loading ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                                    Create Vendor
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
