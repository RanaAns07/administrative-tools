'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState } from 'react';
import { Plus, Search, Loader2, User } from 'lucide-react';
import RoleGuard from '../../_components/RoleGuard';

const DEPTS = ['Administration', 'Computer Science', 'Business', 'Engineering', 'Sciences', 'Social Sciences', 'Finance', 'HR', 'IT'];
const EMP_TYPES = ['PERMANENT', 'CONTRACT', 'VISITING'];

export default function EmployeesClient({ initialEmployees }: { initialEmployees: any[] }) {
    const [employees, setEmployees] = useState<any[]>(initialEmployees);
    const [search, setSearch] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [formData, setFormData] = useState({
        name: '', cnic: '', role: '', department: '',
        employmentType: 'PERMANENT', joiningDate: '',
        email: '', phone: '', baseSalary: '', perCreditHourRate: '', ntn: '',
        bankName: '', bankAccountNumber: '', bankAccountTitle: '',
    });

    const filtered = employees.filter(e =>
        e.name.toLowerCase().includes(search.toLowerCase()) ||
        e.cnic?.toLowerCase().includes(search.toLowerCase()) ||
        e.department?.toLowerCase().includes(search.toLowerCase())
    );

    const set = (k: string, v: string) => setFormData(f => ({ ...f, [k]: v }));

    const handleSubmit = async (ev: React.FormEvent) => {
        ev.preventDefault();
        setLoading(true); setError('');
        try {
            const payload = {
                ...formData,
                baseSalary: parseFloat(formData.baseSalary) || 0,
                perCreditHourRate: parseFloat(formData.perCreditHourRate) || 0
            };

            const res = await fetch('/api/finance/hr/employees', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to create staff');

            setEmployees([...employees, data].sort((a, b) => a.name.localeCompare(b.name)));
            setIsModalOpen(false);
            setFormData({
                name: '', cnic: '', role: '', department: '',
                employmentType: 'PERMANENT', joiningDate: '',
                email: '', phone: '', baseSalary: '', perCreditHourRate: '', ntn: '',
                bankName: '', bankAccountNumber: '', bankAccountTitle: '',
            });
        } catch (err: any) { setError(err.message); }
        finally { setLoading(false); }
    };

    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {/* Toolbar */}
            <div className="p-4 sm:p-6 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="relative">
                    <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
                    <input type="text" placeholder="Search by name, CNIC, department..." value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm w-full sm:w-80 focus:outline-none focus:ring-2 focus:ring-leads-blue"
                    />
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-500">{filtered.length} staff</span>
                    <RoleGuard>
                        <button onClick={() => setIsModalOpen(true)}
                            className="flex items-center gap-2 bg-leads-blue text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-800 transition-colors">
                            <Plus size={16} /> Add Staff
                        </button>
                    </RoleGuard>
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-gray-50 border-b border-gray-100 text-gray-500 text-xs font-semibold uppercase tracking-wider">
                        <tr>
                            <th className="px-6 py-3">Staff Member</th>
                            <th className="px-6 py-3">Department / Role</th>
                            <th className="px-6 py-3">Type</th>
                            <th className="px-6 py-3 text-right">Compensation</th>
                            <th className="px-6 py-3">Joining Date</th>
                            <th className="px-6 py-3">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {filtered.length === 0 ? (
                            <tr><td colSpan={6} className="py-16 text-center text-gray-400">
                                <User className="mx-auto mb-2 text-gray-200" size={32} />
                                No staff found{search ? ' matching your search.' : '. Click "Add Staff" to get started.'}
                            </td></tr>
                        ) : filtered.map(emp => (
                            <tr key={emp._id} className="hover:bg-gray-50/50 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-full bg-leads-blue/10 text-leads-blue flex items-center justify-center font-bold text-sm flex-shrink-0">
                                            {emp.name[0]}
                                        </div>
                                        <div>
                                            <p className="font-semibold text-gray-900">{emp.name}</p>
                                            <p className="text-xs font-mono text-gray-400">{emp.cnic || 'No CNIC'}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <p className="font-medium text-gray-700">{emp.role}</p>
                                    <p className="text-xs text-gray-400">{emp.department}</p>
                                </td>
                                <td className="px-6 py-4">
                                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded font-medium">{emp.employmentType}</span>
                                </td>
                                <td className="px-6 py-4 text-right font-mono font-bold text-gray-900">
                                    {emp.employmentType === 'VISITING'
                                        ? `PKR ${(emp.perCreditHourRate || 0).toLocaleString('en-PK')}/hr`
                                        : `PKR ${(emp.baseSalary || 0).toLocaleString('en-PK')}/mo`}
                                </td>
                                <td className="px-6 py-4 text-xs text-gray-500">
                                    {emp.joiningDate ? new Date(emp.joiningDate).toLocaleDateString('en-PK', { dateStyle: 'medium' }) : '-'}
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`text-xs px-2.5 py-1 rounded-full font-semibold border ${emp.isActive ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-gray-100 text-gray-500'}`}>
                                        {emp.isActive ? 'ACTIVE' : 'INACTIVE'}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Add Employee Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col">
                        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                            <h3 className="font-bold text-gray-900">Add New Staff Member</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                                <Plus size={20} className="rotate-45" />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5">
                            {error && <div className="p-3 bg-rose-50 text-rose-600 rounded-lg text-sm border border-rose-100">{error}</div>}

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="sm:col-span-2">
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">Full Name *</label>
                                    <input required value={formData.name} onChange={e => set('name', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-leads-blue" />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">CNIC</label>
                                    <input value={formData.cnic} onChange={e => set('cnic', e.target.value)}
                                        placeholder="35202-1234567-8"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-leads-blue" />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">Employment Type *</label>
                                    <select required value={formData.employmentType} onChange={e => set('employmentType', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-leads-blue">
                                        {EMP_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">Role / Designation *</label>
                                    <input required value={formData.role} onChange={e => set('role', e.target.value)}
                                        placeholder="e.g. Senior Lecturer"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-leads-blue" />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">Department *</label>
                                    <select required value={formData.department} onChange={e => set('department', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-leads-blue">
                                        <option value="">-- Select --</option>
                                        {DEPTS.map(d => <option key={d}>{d}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">Joining Date</label>
                                    <input type="date" value={formData.joiningDate} onChange={e => set('joiningDate', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-leads-blue" />
                                </div>

                                {formData.employmentType === 'VISITING' ? (
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-700 mb-1">Per Credit Hour Rate (PKR) *</label>
                                        <input required type="number" min="0" value={formData.perCreditHourRate} onChange={e => set('perCreditHourRate', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-leads-blue" />
                                    </div>
                                ) : (
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-700 mb-1">Base Salary (PKR) *</label>
                                        <input required type="number" min="0" value={formData.baseSalary} onChange={e => set('baseSalary', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-leads-blue" />
                                    </div>
                                )}

                                <div className="sm:col-span-2 pt-2 border-t border-gray-100">
                                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Contact, Tax & Bank</h4>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">Email</label>
                                    <input type="email" value={formData.email} onChange={e => set('email', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-leads-blue" />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">Phone</label>
                                    <input value={formData.phone} onChange={e => set('phone', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-leads-blue" />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">NTN</label>
                                    <input value={formData.ntn} onChange={e => set('ntn', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-leads-blue" />
                                </div>
                                <div></div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">Bank Name</label>
                                    <input value={formData.bankName} onChange={e => set('bankName', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-leads-blue" />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">Account Number</label>
                                    <input value={formData.bankAccountNumber} onChange={e => set('bankAccountNumber', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-leads-blue" />
                                </div>
                                <div className="sm:col-span-2">
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">Account Title</label>
                                    <input value={formData.bankAccountTitle} onChange={e => set('bankAccountTitle', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-leads-blue" />
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg">Cancel</button>
                                <button type="submit" disabled={loading} className="px-5 py-2 text-sm font-bold text-white bg-leads-blue hover:bg-blue-800 rounded-lg flex items-center gap-2 disabled:opacity-50">
                                    {loading ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
                                    Create Staff
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
