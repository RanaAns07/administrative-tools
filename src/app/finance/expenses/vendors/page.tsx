import { Suspense } from 'react';
import VendorsClient from './VendorsClient';
import { Loader2 } from 'lucide-react';
import dbConnect from '@/lib/mongodb';
import Vendor from '@/models/finance/Vendor';

export default async function VendorsPage() {
    await dbConnect();

    // Initial fetch for SSR
    const rawVendors = await Vendor.find({}).sort({ companyName: 1 }).lean();
    const initialVendors = JSON.parse(JSON.stringify(rawVendors));

    return (
        <div className="max-w-[1200px] mx-auto space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Vendors</h1>
                    <p className="text-sm text-gray-500 mt-1">Manage vendor profiles, tax info, and payment records.</p>
                </div>
            </div>

            <Suspense fallback={<div className="flex justify-center py-12"><Loader2 className="animate-spin text-leads-blue" /></div>}>
                <VendorsClient initialVendors={initialVendors} />
            </Suspense>
        </div>
    );
}
