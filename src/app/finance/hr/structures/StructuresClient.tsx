'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState } from 'react';
import { Plus, Search, Loader2, Calculator, Settings2, Trash2, Power } from 'lucide-react';
import RoleGuard from '../../_components/RoleGuard';

export default function StructuresClient({ initialComponents, staff }: { initialComponents: any[], staff: any[] }) {
    const [components, setComponents] = useState<any[]>(initialComponents);
    const [search, setSearch] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const [formData, setFormData] = useState({
        staffId: '',
        componentType: 'ALLOWANCE',
        name: '',
        calculationType: 'FIXED',
        value: ''
    });

    const filtered = components.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.staffId?.name?.toLowerCase().includes(search.toLowerCase())
    );

    const set = (k: string, v: string) => setFormData(f => ({ ...f, [k]: v }));

    const handleSubmit = async (ev: React.FormEvent) => {
        ev.preventDefault();
        setLoading(true); setError('');
        try {
            const res = await fetch('/api/finance/hr/structures', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...formData, value: parseFloat(formData.value) || 0 })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to create component');

            setComponents([data, ...components]);
            setIsModalOpen(false);
            setFormData({ staffId: '', componentType: 'ALLOWANCE', name: '', calculationType: 'FIXED', value: '' });
        } catch (err: any) { setError(err.message); }
        finally { setLoading(false); }
    };

    const toggleStatus = async (id: string, currentStatus: boolean) => {
        try {
            const res = await fetch(`/api/finance/hr/structures/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isActive: !currentStatus })
            });
            const data = await res.json();
            if (res.ok) {
                setComponents(components.map(c => c._id === id ? data : c));
            }
        } catch (err) {
            console.error(err);
        }
    };

    const deleteComponent = async (id: string) => {
        if (!confirm('Are you sure you want to delete this specific component?')) return;
        try {
            const res = await fetch(`/api/finance/hr/structures/${id}`, { method: 'DELETE' });
            if (res.ok) {
                setComponents(components.filter(c => c._id !== id));
            }
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-4 sm:p-6 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="relative">
                    <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
                    <input type="text" placeholder="Search components or staff..." value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm w-full sm:w-80 focus:outline-none focus:ring-2 focus:ring-leads-blue"
                    />
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-500">{filtered.length} components</span>
                    <RoleGuard>
                        <button onClick={() => setIsModalOpen(true)}
                            className="flex items-center gap-2 bg-leads-blue text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-800 transition-colors">
                            <Plus size={16} /> Add Component
                        </button>
                    </RoleGuard>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-gray-50 border-b border-gray-100 text-gray-500 text-xs font-semibold uppercase tracking-wider">
                        <tr>
                            <th className="px-6 py-3">Staff Member</th>
                            <th className="px-6 py-3">Component Type</th>
                            <th className="px-6 py-3">Name</th>
                            <th className="px-6 py-3 text-right">Value / Calc</th>
                            <th className="px-6 py-3">Status</th>
                            <th className="px-6 py-3 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {filtered.length === 0 ? (
                            <tr><td colSpan={6} className="py-16 text-center text-gray-400">
                                <Settings2 className="mx-auto mb-2 text-gray-200" size={32} />
                                No salary structures found.
                            </td></tr>
                        ) : filtered.map(comp => (
                            <tr key={comp._id} className="hover:bg-gray-50/50 transition-colors">
                                <td className="px-6 py-4">
                                    <p className="font-semibold text-gray-900">{comp.staffId?.name || 'Unknown'}</p>
                                    <p className="text-xs text-gray-400">{comp.staffId?.department} • {comp.staffId?.role}</p>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`text-xs px-2 py-1 rounded font-medium ${comp.componentType === 'ALLOWANCE' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                                        {comp.componentType}
                                    </span>
                                </td>
                                <td className="px-6 py-4 font-medium text-gray-700">{comp.name}</td>
                                <td className="px-6 py-4 text-right">
                                    <p className="font-mono font-bold text-gray-900">
                                        {comp.calculationType === 'PERCENTAGE' ? `${comp.value}%` : `PKR ${comp.value.toLocaleString()}`}
                                    </p>
                                    <p className="text-xs text-gray-400">{comp.calculationType}</p>
                                </td>
                                <td className="px-6 py-4">
                                    <button onClick={() => toggleStatus(comp._id, comp.isActive)}
                                        className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-semibold border transition-colors ${comp.isActive ? 'bg-indigo-50 text-indigo-700 border-indigo-100 hover:bg-indigo-100' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                                        <Power size={12} /> {comp.isActive ? 'ACTIVE' : 'INACTIVE'}
                                    </button>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <button onClick={() => deleteComponent(comp._id)} className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors">
                                        <Trash2 size={16} />
                                    </button>
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
                            <h3 className="font-bold text-gray-900">Add Salary Component</h3>
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
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">Type *</label>
                                    <select required value={formData.componentType} onChange={e => set('componentType', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-leads-blue">
                                        <option value="ALLOWANCE">Allowance (Add)</option>
                                        <option value="DEDUCTION">Deduction (Sub)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">Calc Type *</label>
                                    <select required value={formData.calculationType} onChange={e => set('calculationType', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-leads-blue">
                                        <option value="FIXED">Fixed (PKR)</option>
                                        <option value="PERCENTAGE">Percentage (%) of Base</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">Component Name *</label>
                                <input required value={formData.name} onChange={e => set('name', e.target.value)}
                                    placeholder="e.g. Housing Allowance, Income Tax..."
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-leads-blue" />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">Value *</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Calculator size={14} className="text-gray-400" />
                                    </div>
                                    <input required type="number" min="0" step="0.01" value={formData.value} onChange={e => set('value', e.target.value)}
                                        placeholder={formData.calculationType === 'PERCENTAGE' ? 'e.g. 5' : 'e.g. 5000'}
                                        className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-leads-blue" />
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-2">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg">Cancel</button>
                                <button type="submit" disabled={loading} className="px-5 py-2 text-sm font-bold text-white bg-leads-blue hover:bg-blue-800 rounded-lg flex items-center gap-2">
                                    {loading ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />} Save
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
