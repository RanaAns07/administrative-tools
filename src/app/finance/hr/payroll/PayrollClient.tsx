'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState, useMemo } from 'react';
import { Loader2, PlayCircle, Building2, User } from 'lucide-react';

export default function PayrollClient({
    initialRuns: _runs,
    staff,
    wallets,
    components
}: {
    initialRuns: any[];
    staff: any[];
    wallets: any[];
    components: any[];
}) {
    const today = new Date();
    const [month, setMonth] = useState(today.getMonth() + 1);
    const [year, setYear] = useState(today.getFullYear());
    const [walletId, setWalletId] = useState(wallets[0]?._id || '');
    const [visitingHours, setVisitingHours] = useState<Record<string, number>>({});

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Pre-calculate payroll data based on selected month/year/hours
    const payrollData = useMemo(() => {
        return staff.map(emp => {
            // Base Salary Calculation
            let baseAmt = 0;
            if (emp.employmentType === 'VISITING') {
                const hrs = visitingHours[emp._id] || 0;
                baseAmt = hrs * (emp.perCreditHourRate || 0);
            } else {
                baseAmt = emp.baseSalary || 0;
            }

            // Calculate allowances and deductions from components
            const empComps = components.filter(c => c.staffId === emp._id);
            let totalAllowances = 0;
            let totalDeductions = 0;

            empComps.forEach(comp => {
                const amt = comp.calculationType === 'PERCENTAGE'
                    ? (baseAmt * (comp.value / 100))
                    : comp.value;

                if (comp.componentType === 'ALLOWANCE') totalAllowances += amt;
                if (comp.componentType === 'DEDUCTION') totalDeductions += amt;
            });

            const netPayable = Math.max(0, baseAmt + totalAllowances - totalDeductions);

            return {
                staffId: emp._id,
                name: emp.name,
                role: emp.role,
                department: emp.department,
                employmentType: emp.employmentType,
                baseSalary: baseAmt,
                allowances: totalAllowances,
                deductions: totalDeductions,
                netPayable
            };
        });
    }, [staff, components, visitingHours]);

    const totalPayroll = payrollData.reduce((sum, d) => sum + d.netPayable, 0);

    const handleSubmit = async () => {
        if (!walletId) {
            setError('Please select a payment wallet.');
            return;
        }
        if (!confirm(`Are you sure you want to disburse PKR ${totalPayroll.toLocaleString()}? This action cannot be undone.`)) return;

        setLoading(true); setError(''); setSuccess('');
        try {
            const res = await fetch('/api/finance/hr/payroll', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    month,
                    year,
                    walletId,
                    slips: payrollData.map(d => ({
                        staffId: d.staffId,
                        baseSalary: d.baseSalary,
                        allowances: d.allowances,
                        deductions: d.deductions,
                        netPayable: d.netPayable
                    }))
                })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to disburse payroll');
            setSuccess(`Successfully generated and paid ${data.count} salary slips.`);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <div className="flex flex-col md:flex-row gap-6 items-end">
                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1">Month</label>
                            <select value={month} onChange={e => setMonth(Number(e.target.value))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-leads-blue">
                                {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                                    <option key={m} value={m}>{new Date(2000, m - 1).toLocaleString('default', { month: 'long' })}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1">Year</label>
                            <input type="number" value={year} onChange={e => setYear(Number(e.target.value))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-leads-blue" />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1">Disburse From Wallet</label>
                            <select value={walletId} onChange={e => setWalletId(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-leads-blue">
                                <option value="">-- Select Wallet --</option>
                                {wallets.map(w => (
                                    <option key={w._id} value={w._id}>{w.name} (PKR {w.currentBalance.toLocaleString()})</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {error && <div className="p-4 bg-rose-50 text-rose-700 rounded-xl border border-rose-100 font-medium">{error}</div>}
            {success && <div className="p-4 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-100 font-medium">{success}</div>}

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-4 sm:p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-leads-blue/10 text-leads-blue rounded-lg">
                            <Building2 size={20} />
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-900">Payroll Preview</h3>
                            <p className="text-xs text-gray-500">Review calculated salaries before disbursement.</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-xs text-gray-500">Total Payroll</p>
                        <p className="text-xl font-bold text-gray-900">PKR {totalPayroll.toLocaleString()}</p>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-gray-50 border-b border-gray-100 text-gray-500 text-xs font-semibold uppercase tracking-wider">
                            <tr>
                                <th className="px-6 py-3">Staff Member</th>
                                <th className="px-6 py-3 w-32">Hours (Visiting)</th>
                                <th className="px-6 py-3 text-right">Base Pay</th>
                                <th className="px-6 py-3 text-right">Allowances</th>
                                <th className="px-6 py-3 text-right">Deductions</th>
                                <th className="px-6 py-3 text-right">Net Payable</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {payrollData.length === 0 ? (
                                <tr><td colSpan={6} className="py-16 text-center text-gray-400">
                                    <User className="mx-auto mb-2 text-gray-200" size={32} />
                                    No active staff members found.
                                </td></tr>
                            ) : payrollData.map((d) => (
                                <tr key={d.staffId} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <p className="font-semibold text-gray-900">{d.name}</p>
                                        <p className="text-xs text-gray-400">{d.department} • {d.role}</p>
                                    </td>
                                    <td className="px-6 py-4">
                                        {d.employmentType === 'VISITING' ? (
                                            <input
                                                type="number" min="0"
                                                value={visitingHours[d.staffId] || ''}
                                                onChange={e => setVisitingHours(prev => ({ ...prev, [d.staffId]: Number(e.target.value) }))}
                                                placeholder="hrs"
                                                className="w-20 px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-leads-blue"
                                            />
                                        ) : (
                                            <span className="text-gray-300">-</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-right font-mono">
                                        {d.baseSalary.toLocaleString()}
                                    </td>
                                    <td className="px-6 py-4 text-right font-mono text-emerald-600">
                                        +{d.allowances.toLocaleString()}
                                    </td>
                                    <td className="px-6 py-4 text-right font-mono text-rose-600">
                                        -{d.deductions.toLocaleString()}
                                    </td>
                                    <td className="px-6 py-4 text-right font-mono font-bold text-gray-900 bg-gray-50">
                                        PKR {d.netPayable.toLocaleString()}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-end">
                    <button onClick={handleSubmit} disabled={loading || payrollData.length === 0}
                        className="flex items-center gap-2 bg-leads-blue text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-800 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">
                        {loading ? <Loader2 size={18} className="animate-spin" /> : <PlayCircle size={18} />}
                        Disburse Payroll
                    </button>
                </div>
            </div>
        </div>
    );
}
