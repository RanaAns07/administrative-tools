'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Users, Plus, Loader2, X, Check } from 'lucide-react';

interface Employee { _id: string; employeeCode: string; name: string; designation: string; department: string; employeeType: string; status: string; basicSalary: number; joiningDate: string; }

const typeColors: Record<string, string> = {
    PERMANENT: 'bg-blue-100 text-blue-700', CONTRACT: 'bg-yellow-100 text-yellow-700',
    VISITING: 'bg-purple-100 text-purple-700', DAILY_WAGE: 'bg-gray-100 text-gray-700',
};

export default function EmployeesPage() {
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [filterStatus, setFilterStatus] = useState('ACTIVE');

    const [form, setForm] = useState({
        name: '', cnic: '', designation: '', department: '', employeeType: 'PERMANENT',
        joiningDate: '', basicSalary: 0, payrollAccountCode: '5001', email: '', phone: '',
    });

    const fetchEmployees = (status = 'ACTIVE') => {
        setLoading(true);
        fetch(`/api/finance/employees?status=${status}`)
            .then(r => r.json()).then(setEmployees).finally(() => setLoading(false));
    };

    useEffect(() => { fetchEmployees(filterStatus); }, [filterStatus]);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault(); setSaving(true); setError(null);
        try {
            const res = await fetch('/api/finance/employees', {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setShowModal(false); fetchEmployees(filterStatus);
            setForm({ name: '', cnic: '', designation: '', department: '', employeeType: 'PERMANENT', joiningDate: '', basicSalary: 0, payrollAccountCode: '5001', email: '', phone: '' });
        } catch (err: any) { setError(err.message); }
        finally { setSaving(false); }
    };

    const depts = ['Academic', 'Administration', 'Finance', 'IT', 'Library', 'HR', 'Security', 'Maintenance'];

    return (
        <div className="space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h1 className="text-xl font-bold text-leads-blue flex items-center gap-2"><Users size={22} /> Employees</h1>
                    <p className="text-xs text-gray-500 mt-0.5">Payroll employee register · {employees.length} shown</p>
                </div>
                <button onClick={() => setShowModal(true)}
                    className="flex items-center gap-2 bg-leads-blue text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-800 shadow-sm">
                    <Plus size={16} /> Add Employee
                </button>
            </div>

            {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm flex gap-2">{error}<button className="ml-auto" onClick={() => setError(null)}><X size={12} /></button></div>}

            <div className="flex gap-2">
                {['ACTIVE', 'INACTIVE', 'TERMINATED', 'ALL'].map(s => (
                    <button key={s} onClick={() => setFilterStatus(s)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filterStatus === s ? 'bg-leads-blue text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                        {s}
                    </button>
                ))}
            </div>

            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 border-b border-gray-100 text-xs uppercase text-gray-500 font-semibold">
                            <tr>
                                <th className="px-4 py-3">Code</th>
                                <th className="px-4 py-3">Name</th>
                                <th className="px-4 py-3">Designation</th>
                                <th className="px-4 py-3">Department</th>
                                <th className="px-4 py-3">Type</th>
                                <th className="px-4 py-3 text-right">Basic Salary</th>
                                <th className="px-4 py-3">Joining</th>
                                <th className="px-4 py-3 text-center">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {loading ? <tr><td colSpan={8} className="py-12 text-center"><Loader2 className="animate-spin mx-auto text-gray-400" size={22} /></td></tr>
                                : employees.length === 0 ? <tr><td colSpan={8} className="py-10 text-center text-gray-400 text-sm">No employees found.</td></tr>
                                    : employees.map((emp, i) => (
                                        <motion.tr key={emp._id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}
                                            className="hover:bg-blue-50/20 transition-colors">
                                            <td className="px-4 py-3 font-mono text-xs font-semibold text-leads-blue">{emp.employeeCode}</td>
                                            <td className="px-4 py-3 font-medium text-gray-800">{emp.name}</td>
                                            <td className="px-4 py-3 text-xs text-gray-600">{emp.designation}</td>
                                            <td className="px-4 py-3 text-xs text-gray-500">{emp.department}</td>
                                            <td className="px-4 py-3"><span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${typeColors[emp.employeeType] || 'bg-gray-100 text-gray-700'}`}>{emp.employeeType}</span></td>
                                            <td className="px-4 py-3 text-right font-mono text-xs">PKR {emp.basicSalary.toLocaleString('en-PK')}</td>
                                            <td className="px-4 py-3 text-xs text-gray-500">{new Date(emp.joiningDate).toLocaleDateString('en-PK')}</td>
                                            <td className="px-4 py-3 text-center"><span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${emp.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{emp.status}</span></td>
                                        </motion.tr>
                                    ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm overflow-y-auto">
                    <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 my-4">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="font-bold text-leads-blue">Add Employee</h2>
                            <button onClick={() => setShowModal(false)}><X size={18} className="text-gray-400" /></button>
                        </div>
                        <form onSubmit={handleCreate} className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                                <div><label className="text-xs font-semibold text-gray-600 mb-1 block">Full Name *</label>
                                    <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-leads-blue" /></div>
                                <div><label className="text-xs font-semibold text-gray-600 mb-1 block">CNIC *</label>
                                    <input required value={form.cnic} onChange={e => setForm({ ...form, cnic: e.target.value })}
                                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-leads-blue" placeholder="35201-0000000-0" /></div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div><label className="text-xs font-semibold text-gray-600 mb-1 block">Designation *</label>
                                    <input required value={form.designation} onChange={e => setForm({ ...form, designation: e.target.value })}
                                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-leads-blue" placeholder="Lecturer" /></div>
                                <div><label className="text-xs font-semibold text-gray-600 mb-1 block">Department *</label>
                                    <select required value={form.department} onChange={e => setForm({ ...form, department: e.target.value })}
                                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-leads-blue">
                                        <option value="">-- Select --</option>
                                        {depts.map(d => <option key={d}>{d}</option>)}
                                    </select></div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div><label className="text-xs font-semibold text-gray-600 mb-1 block">Employee Type</label>
                                    <select value={form.employeeType} onChange={e => setForm({ ...form, employeeType: e.target.value })}
                                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-leads-blue">
                                        {['PERMANENT', 'CONTRACT', 'VISITING', 'DAILY_WAGE'].map(t => <option key={t}>{t}</option>)}
                                    </select></div>
                                <div><label className="text-xs font-semibold text-gray-600 mb-1 block">Joining Date *</label>
                                    <input required type="date" value={form.joiningDate} onChange={e => setForm({ ...form, joiningDate: e.target.value })}
                                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-leads-blue" /></div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div><label className="text-xs font-semibold text-gray-600 mb-1 block">Basic Salary (PKR) *</label>
                                    <input required type="number" value={form.basicSalary} onChange={e => setForm({ ...form, basicSalary: parseFloat(e.target.value) || 0 })}
                                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-leads-blue" /></div>
                                <div><label className="text-xs font-semibold text-gray-600 mb-1 block">Payroll Account Code *</label>
                                    <input required value={form.payrollAccountCode} onChange={e => setForm({ ...form, payrollAccountCode: e.target.value })}
                                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-leads-blue" placeholder="5001" /></div>
                            </div>
                            {error && <p className="text-red-600 text-xs bg-red-50 rounded px-3 py-2">{error}</p>}
                            <div className="flex gap-3 pt-1">
                                <button type="button" onClick={() => setShowModal(false)} className="flex-1 border border-gray-200 rounded-lg py-2 text-sm text-gray-600">Cancel</button>
                                <button type="submit" disabled={saving} className="flex-1 bg-leads-blue text-white rounded-lg py-2 text-sm font-medium hover:bg-blue-800 flex items-center justify-center gap-2">
                                    {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Add Employee
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}
        </div>
    );
}
