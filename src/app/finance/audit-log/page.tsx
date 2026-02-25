'use client';
import { ShieldCheck } from 'lucide-react';
import { useEffect, useState } from 'react';

interface Log { _id: string; action: string; entityType: string; entityReference: string; performedBy: string; performedAt: string; notes?: string; }

export default function AuditLogPage() {
    const [logs, setLogs] = useState<Log[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/finance/audit-log').then(r => r.json()).then(d => setLogs(d || [])).finally(() => setLoading(false));
    }, []);

    return (
        <div className="space-y-5">
            <h1 className="text-xl font-bold text-leads-blue flex items-center gap-2"><ShieldCheck size={22} /> Audit Log</h1>
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 border-b border-gray-100 text-xs uppercase text-gray-500 font-semibold">
                            <tr><th className="px-4 py-3">Action</th><th className="px-4 py-3">Entity</th><th className="px-4 py-3">Reference</th><th className="px-4 py-3">By</th><th className="px-4 py-3">When</th></tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {loading ? (
                                <tr><td colSpan={5} className="py-10 text-center text-gray-400 text-sm">Loading audit log...</td></tr>
                            ) : logs.length === 0 ? (
                                <tr><td colSpan={5} className="py-10 text-center text-gray-400 text-sm">No audit events yet. Perform a finance operation to see entries here.</td></tr>
                            ) : logs.map(l => (
                                <tr key={l._id} className="hover:bg-gray-50/50">
                                    <td className="px-4 py-3"><span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded">{l.action}</span></td>
                                    <td className="px-4 py-3 text-xs text-gray-600">{l.entityType}</td>
                                    <td className="px-4 py-3 text-xs font-mono text-leads-blue">{l.entityReference || '—'}</td>
                                    <td className="px-4 py-3 text-xs text-gray-500">{l.performedBy}</td>
                                    <td className="px-4 py-3 text-xs text-gray-400">{new Date(l.performedAt).toLocaleString('en-PK')}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
