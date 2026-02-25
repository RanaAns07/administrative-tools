'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { UserCheck, Play, Loader2, X, Check, Users, IndianRupee } from 'lucide-react';

interface PayrollRun {
    _id: string; runNumber: string; month: number; year: number;
    status: string; totalGross: number; totalNetPayable: number; totalDeductions: number;
    payslips: Array<{ employeeName: string; netSalary: number }>;
    createdAt: string;
}

interface Employee { _id: string; name: string; employeeCode: string; designation: string; department: string; basicSalary: number; status: string; }

const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function PayrollPage() {
    const [runs, setRuns] = useState<PayrollRun[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedRun, setSelectedRun] = useState<PayrollRun | null>(null);
    const now = new Date();
    const [runForm, setRunForm] = useState({ month: now.getMonth() + 1, year: now.getFullYear() });

    const fetchData = () => {
        setLoading(true);
        Promise.all([
            fetch('/api/finance/payroll').then(r => r.json()),
            fetch('/api/finance/employees').then(r => r.json()),
        ]).then(([r, e]) => { setRuns(r); setEmployees(e); }).finally(() => setLoading(false));
    };

    useEffect(() => { fetchData(); }, []);

    const handleProcess = async () => {
        if (!confirm(`Process payroll for ${months[runForm.month - 1]} ${runForm.year}? This will post a journal entry.`)) return;
        setProcessing(true); setError(null);
        try {
            const res = await fetch('/api/finance/payroll', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(runForm),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            fetchData();
        } catch (err: any) { setError(err.message); }
        finally { setProcessing(false); }
    };

    const activeCount = employees.filter(e => e.status === 'ACTIVE').length;

    return (
        <div className="space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h1 className="text-xl font-bold text-leads-blue flex items-center gap-2"><UserCheck size={22} /> Payroll Processing</h1>
                    <p className="text-xs text-gray-500 mt-0.5">{activeCount} active employees · {runs.length} payroll runs</p>
                </div>
            </div>

            {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm flex gap-2">{error}<button className="ml-auto" onClick={() => setError(null)}><X size={12} /></button></div>}

            {/* Process Payroll Card */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h2 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2"><Play size={16} className="text-leads-blue" /> Process New Payroll</h2>
                <div className="flex flex-wrap gap-3 items-end">
                    <div>
                        <label className="text-xs font-semibold text-gray-600 mb-1 block">Month</label>
                        <select value={runForm.month} onChange={e => setRunForm({ ...runForm, month: parseInt(e.target.value) })}
                            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-leads-blue">
                            {months.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="text-xs font-semibold text-gray-600 mb-1 block">Year</label>
                        <input type="number" value={runForm.year} onChange={e => setRunForm({ ...runForm, year: parseInt(e.target.value) })}
                            className="w-24 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-leads-blue" />
                    </div>
                    <button onClick={handleProcess} disabled={processing || activeCount === 0}
                        className="flex items-center gap-2 bg-leads-blue text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-800 disabled:opacity-50 transition-colors">
                        {processing ? <><Loader2 size={15} className="animate-spin" /> Processing...</> : <><Play size={15} /> Run Payroll for {activeCount} Employees</>}
                    </button>
                </div>
                <p className="text-[10px] text-gray-400 mt-3">Running payroll will compute salaries, deductions, and auto-post a double-entry journal entry (DR Salary Expense / CR Salary Payable).</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* Payroll Runs List */}
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-100 text-xs font-bold text-gray-600 uppercase tracking-wider">Payroll Runs</div>
                    {loading ? <div className="py-10 text-center"><Loader2 className="animate-spin mx-auto text-gray-400" size={20} /></div>
                        : runs.length === 0 ? <p className="py-8 text-center text-gray-400 text-sm">No payroll runs yet.</p>
                            : <div className="divide-y divide-gray-50">
                                {runs.map(run => (
                                    <button key={run._id} onClick={() => setSelectedRun(run)}
                                        className={`w-full text-left px-4 py-3 transition-colors ${selectedRun?._id === run._id ? 'bg-leads-blue/5 border-r-2 border-leads-blue' : 'hover:bg-gray-50'}`}>
                                        <div className="flex items-center justify-between">
                                            <p className="text-sm font-semibold text-gray-800">{months[run.month - 1]} {run.year}</p>
                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700">{run.status}</span>
                                        </div>
                                        <p className="text-xs text-gray-500 mt-0.5">Net: PKR {run.totalNetPayable.toLocaleString('en-PK')}</p>
                                    </button>
                                ))}
                            </div>}
                </div>

                {/* Payslip Details */}
                <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-100 text-xs font-bold text-gray-600 uppercase tracking-wider">
                        {selectedRun ? `Payslips — ${months[selectedRun.month - 1]} ${selectedRun.year}` : 'Select a Payroll Run'}
                    </div>
                    {!selectedRun ? (
                        <p className="py-8 text-center text-gray-400 text-sm">Click a payroll run to see payslips.</p>
                    ) : (
                        <>
                            <div className="grid grid-cols-3 gap-0 border-b border-gray-100">
                                {[
                                    { label: 'Gross Salary', value: `PKR ${selectedRun.totalGross.toLocaleString('en-PK')}`, color: 'text-blue-700' },
                                    { label: 'Total Deductions', value: `PKR ${selectedRun.totalDeductions.toLocaleString('en-PK')}`, color: 'text-red-700' },
                                    { label: 'Net Payable', value: `PKR ${selectedRun.totalNetPayable.toLocaleString('en-PK')}`, color: 'text-green-700' },
                                ].map(s => (
                                    <div key={s.label} className="px-4 py-3 border-r border-gray-100 last:border-r-0">
                                        <p className="text-[10px] text-gray-500">{s.label}</p>
                                        <p className={`text-sm font-bold ${s.color}`}>{s.value}</p>
                                    </div>
                                ))}
                            </div>
                            <div className="overflow-y-auto max-h-80">
                                <table className="w-full text-xs">
                                    <thead className="bg-gray-50 border-b border-gray-100 sticky top-0">
                                        <tr>
                                            <th className="px-4 py-2 text-left font-semibold text-gray-600">Employee</th>
                                            <th className="px-4 py-2 text-right font-semibold text-gray-600">Gross</th>
                                            <th className="px-4 py-2 text-right font-semibold text-gray-600">Deductions</th>
                                            <th className="px-4 py-2 text-right font-semibold text-gray-600">Net</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {selectedRun.payslips.map((p, i) => (
                                            <tr key={i} className="hover:bg-gray-50/50">
                                                <td className="px-4 py-2 font-medium text-gray-800">{p.employeeName}</td>
                                                <td className="px-4 py-2 text-right font-mono text-gray-600">{(p as any).grossSalary?.toLocaleString('en-PK') || '—'}</td>
                                                <td className="px-4 py-2 text-right font-mono text-red-600">{(p as any).totalDeductions?.toLocaleString('en-PK') || '—'}</td>
                                                <td className="px-4 py-2 text-right font-mono font-bold text-green-700">{p.netSalary.toLocaleString('en-PK')}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
