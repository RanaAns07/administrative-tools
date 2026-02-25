'use client';
import { Wallet } from 'lucide-react';
export default function CashBankPage() {
    return (
        <div className="space-y-5">
            <h1 className="text-xl font-bold text-leads-blue flex items-center gap-2"><Wallet size={22} /> Cash & Bank Management</h1>
            <div className="bg-white rounded-xl border border-gray-200 py-16 text-center text-gray-400">
                <Wallet size={40} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm font-semibold">Cash & Bank Module</p>
                <p className="text-xs mt-1">Manage bank accounts, bank reconciliation, and petty cash. Backend BankAccount model is configured.</p>
            </div>
        </div>
    );
}
