/* eslint-disable @typescript-eslint/no-explicit-any */
import dbConnect from '@/lib/mongodb';
import PayrollRun from '@/models/finance/PayrollRun';
import UniversityStaff from '@/models/finance/UniversityStaff';
import Wallet from '@/models/finance/Wallet';
import mongoose from 'mongoose';
import PayrollClient from './PayrollClient';

export const dynamic = 'force-dynamic';

export default async function HRPayrollPage() {
    await dbConnect();
    const [rawRuns, rawStaff, rawWallets, rawComponents] = await Promise.all([
        PayrollRun.find({}).sort({ year: -1, month: -1 }).limit(20).lean(),
        UniversityStaff.find({ isActive: true }).sort({ name: 1 }).lean(),
        Wallet.find({ isActive: true }).sort({ name: 1 }).lean(),
        mongoose.models.StaffPayComponent?.find({ isActive: true }).lean() || []
    ]);

    return (
        <div className="max-w-[1300px] mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Payroll</h1>
                <p className="text-sm text-gray-500 mt-1">Generate and disburse monthly salary runs.</p>
            </div>
            <PayrollClient
                initialRuns={JSON.parse(JSON.stringify(rawRuns))}
                staff={JSON.parse(JSON.stringify(rawStaff))}
                wallets={JSON.parse(JSON.stringify(rawWallets))}
                components={JSON.parse(JSON.stringify(rawComponents))}
            />
        </div>
    );
}
