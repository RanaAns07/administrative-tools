'use client';
import { Building2 } from 'lucide-react';
export default function AssetsPage() {
    return (
        <div className="space-y-5">
            <h1 className="text-xl font-bold text-leads-blue flex items-center gap-2"><Building2 size={22} /> Fixed Assets</h1>
            <div className="bg-white rounded-xl border border-gray-200 py-16 text-center text-gray-400">
                <Building2 size={40} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm font-semibold">Asset Management Module</p>
                <p className="text-xs mt-1">Track fixed assets, depreciation schedules (straight-line & declining balance), and disposal. Backend model is fully configured.</p>
            </div>
        </div>
    );
}
