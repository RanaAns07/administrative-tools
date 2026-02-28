'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Plus, Loader2, X, CheckCircle2, Users } from 'lucide-react';

function formatPKR(n: number = 0) {
    return new Intl.NumberFormat('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function FacultyManager({ initialFaculty, departments }: { initialFaculty: any[], departments: any[] }) {
    const [search, setSearch] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Form state for a basic Faculty registration
    const [name, setName] = useState('');
    const [cnic, setCnic] = useState('');
    const [designation, setDesignation] = useState('Lecturer');
    const [department, setDepartment] = useState(departments[0]?.code || '');
    const [employeeType, setEmployeeType] = useState('PERMANENT');
    const [joiningDate, setJoiningDate] = useState(new Date().toISOString().split('T')[0]);
    const [basicSalary, setBasicSalary] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const filtered = initialFaculty.filter(f =>
        f.name.toLowerCase().includes(search.toLowerCase()) ||
        f.employeeCode.toLowerCase().includes(search.toLowerCase()) ||
        f.department.toLowerCase().includes(search.toLowerCase()) ||
        f.designation.toLowerCase().includes(search.toLowerCase())
    );

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);

        try {
            const res = await fetch('/api/finance/university/faculty', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name,
                    cnic,
                    designation,
                    department,
                    employeeType,
                    joiningDate,
                    basicSalary: Number(basicSalary)
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to register faculty');

            window.location.reload();
        } catch (err: any) {
            setError(err.message || 'An error occurred.');
            setIsSubmitting(false);
        }
    };

    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-4 sm:p-6 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="relative">
                    <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
                    <input type="text" placeholder="Search faculty by name, code, dept..." value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm w-80 focus:outline-none focus:ring-2 focus:ring-leads-blue"
                    />
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="bg-leads-blue hover:bg-blue-800 text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
                >
                    <Plus size={16} />
                    Register Faculty
                </button>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-gray-50 text-gray-500 text-xs font-semibold uppercase border-b border-gray-100">
                        <tr>
                            <th className="px-6 py-3">Employee Code</th>
                            <th className="px-6 py-3">Name</th>
                            <th className="px-6 py-3">Department</th>
                            <th className="px-6 py-3">Designation</th>
                            <th className="px-6 py-3">Type</th>
                            <th className="px-6 py-3">Basic Salary</th>
                            <th className="px-6 py-3">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {filtered.length === 0 ? (
                            <tr><td colSpan={7} className="py-16 text-center text-gray-400">
                                <Users className="mx-auto mb-2 text-gray-200" size={32} />
                                No faculty members found.
                            </td></tr>
                        ) : filtered.map(f => (
                            <tr key={f._id} className="hover:bg-gray-50/50 transition-colors">
                                <td className="px-6 py-4 font-mono font-bold text-leads-blue">{f.employeeCode}</td>
                                <td className="px-6 py-4 font-semibold text-gray-900">{f.name}</td>
                                <td className="px-6 py-4">
                                    <span className="text-xs px-2 py-1 bg-gray-100 rounded-md font-semibold text-gray-600">
                                        {f.department}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-gray-700">{f.designation}</td>
                                <td className="px-6 py-4 text-xs font-medium text-gray-500">{f.employeeType.replace('_', ' ')}</td>
                                <td className="px-6 py-4 font-bold text-gray-900">PKR {formatPKR(f.basicSalary)}</td>
                                <td className="px-6 py-4">
                                    <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold uppercase ${f.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-gray-100 text-gray-500 border border-gray-200'}`}>
                                        {f.status}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm overflow-y-auto">
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg my-4"
                        >
                            <div className="flex justify-between items-center p-5 border-b border-gray-100">
                                <h2 className="font-bold text-gray-900">Register Faculty Member</h2>
                                <button type="button" onClick={() => setIsModalOpen(false)}><X size={18} className="text-gray-400 hover:text-gray-600" /></button>
                            </div>

                            <form onSubmit={handleSubmit} className="p-5 space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs font-semibold text-gray-600 mb-1 block">Full Name</label>
                                        <input
                                            required
                                            type="text"
                                            value={name}
                                            onChange={e => setName(e.target.value)}
                                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-leads-blue"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold text-gray-600 mb-1 block">CNIC</label>
                                        <input
                                            required
                                            type="text"
                                            placeholder="xxxxx-xxxxxxx-x"
                                            value={cnic}
                                            onChange={e => setCnic(e.target.value)}
                                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-leads-blue font-mono"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs font-semibold text-gray-600 mb-1 block">Department</label>
                                        <select
                                            required
                                            value={department}
                                            onChange={e => setDepartment(e.target.value)}
                                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-leads-blue bg-white"
                                        >
                                            <option value="">Select Department</option>
                                            {departments.map(d => (
                                                <option key={d._id} value={d.code}>{d.name} ({d.code})</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold text-gray-600 mb-1 block">Designation</label>
                                        <select
                                            required
                                            value={designation}
                                            onChange={e => setDesignation(e.target.value)}
                                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-leads-blue bg-white"
                                        >
                                            <option value="Professor">Professor</option>
                                            <option value="Associate Professor">Associate Professor</option>
                                            <option value="Assistant Professor">Assistant Professor</option>
                                            <option value="Lecturer">Lecturer</option>
                                            <option value="Adjunct Faculty">Adjunct Faculty</option>
                                            <option value="Teaching Assistant">Teaching Assistant</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs font-semibold text-gray-600 mb-1 block">Employment Type</label>
                                        <select
                                            required
                                            value={employeeType}
                                            onChange={e => setEmployeeType(e.target.value)}
                                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-leads-blue bg-white"
                                        >
                                            <option value="PERMANENT">Permanent</option>
                                            <option value="CONTRACT">Contract</option>
                                            <option value="VISITING">Visiting</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold text-gray-600 mb-1 block">Joining Date</label>
                                        <input
                                            required
                                            type="date"
                                            value={joiningDate}
                                            onChange={e => setJoiningDate(e.target.value)}
                                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-leads-blue"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs font-semibold text-gray-600 mb-1 block">Basic Salary (PKR)</label>
                                    <input
                                        required
                                        type="number"
                                        min="0"
                                        value={basicSalary}
                                        onChange={e => setBasicSalary(e.target.value)}
                                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-leads-blue shadow-sm"
                                    />
                                    <p className="text-[10px] text-gray-400 mt-1">* Note: Faculty are registered under the Employee model for unified HR tracking.</p>
                                </div>

                                {error && <p className="text-red-600 text-xs bg-red-50 rounded-lg px-3 py-2 border border-red-100">{error}</p>}

                                <div className="flex gap-3 pt-4">
                                    <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 border border-gray-200 rounded-xl py-2.5 text-sm text-gray-600 hover:bg-gray-50 font-medium transition-colors">Cancel</button>
                                    <button type="submit" disabled={isSubmitting} className="flex-1 bg-leads-blue text-white rounded-xl py-2.5 text-sm font-medium hover:bg-blue-800 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors">
                                        {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                                        {isSubmitting ? 'Registering...' : 'Register Faculty'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
