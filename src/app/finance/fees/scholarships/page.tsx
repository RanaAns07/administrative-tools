/* eslint-disable @typescript-eslint/no-explicit-any */
import dbConnect from '@/lib/mongodb';
import Scholarship from '@/models/finance/Scholarship';
import ScholarshipsClient from './ScholarshipsClient';

export const dynamic = 'force-dynamic';

export default async function ScholarshipsPage() {
    await dbConnect();
    const raw = await Scholarship.find({}).sort({ createdAt: -1 }).lean();
    return (
        <div className="max-w-[1200px] mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Scholarships & Discounts</h1>
                <p className="text-sm text-gray-500 mt-1">Manage merit, need-based, and category discounts applied to student fee invoices.</p>
            </div>
            <ScholarshipsClient initialScholarships={JSON.parse(JSON.stringify(raw))} />
        </div>
    );
}
