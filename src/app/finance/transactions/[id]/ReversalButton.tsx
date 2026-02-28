'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { RotateCcw, AlertTriangle, Loader2 } from 'lucide-react';
import RoleGuard from '../../_components/RoleGuard';

export default function ReversalButton({ txId, isReversed, txType }: { txId: string, isReversed: boolean, txType: string }) {
    const router = useRouter();
    const [showConfirm, setShowConfirm] = useState(false);
    const [reason, setReason] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const canReverse = !isReversed && txType !== 'REVERSAL' && txType !== 'STUDENT_ADVANCE_DEDUCTION';

    if (!canReverse) return null;

    const handleReverse = async () => {
        if (reason.trim().length < 5) {
            setError('Please provide a descriptive reason (at least 5 characters).');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const res = await fetch(`/api/finance/transactions/${txId}/reverse`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reason })
            });
            const data = await res.json();

            if (!res.ok) throw new Error(data.error || 'Failed to reverse transaction');

            setShowConfirm(false);
            router.refresh();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <RoleGuard>
                <button
                    onClick={() => setShowConfirm(true)}
                    className="flex items-center gap-2 bg-rose-50 text-rose-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-rose-100 transition-colors"
                >
                    <RotateCcw size={16} /> Reverse Transaction
                </button>
            </RoleGuard>

            {showConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
                        <div className="flex items-start gap-4 mb-4">
                            <div className="bg-rose-100 p-2 rounded-full text-rose-600">
                                <AlertTriangle size={24} />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-gray-900">Confirm Reversal</h3>
                                <p className="text-sm text-gray-500 mt-1">
                                    Reversing this transaction will deduct/add funds back to the wallet and undo related impacts (e.g. invoice status). This action creates a traceable reversal entry and cannot be undone.
                                </p>
                            </div>
                        </div>

                        <div className="mt-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Reason for Reversal <span className="text-red-500">*</span></label>
                            <textarea
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                placeholder="E.g., Incorrect amount entered, Wrong student ID..."
                                className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-rose-500 focus:outline-none"
                                rows={3}
                            />
                        </div>

                        {error && <p className="text-sm text-rose-500 mt-2 bg-rose-50 p-2 rounded">{error}</p>}

                        <div className="mt-6 flex justify-end gap-3 border-t pt-4">
                            <button
                                onClick={() => setShowConfirm(false)}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleReverse}
                                disabled={loading}
                                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-rose-600 rounded-lg hover:bg-rose-700 transition-colors disabled:opacity-50"
                            >
                                {loading ? <Loader2 size={16} className="animate-spin" /> : <RotateCcw size={16} />}
                                Confirm Reversal
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
