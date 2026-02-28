import dbConnect from '@/lib/mongodb';
import LoanAdvance from '@/models/finance/LoanAdvance';
import UniversityStaff from '@/models/finance/UniversityStaff';
import Wallet from '@/models/finance/Wallet';
import LoansClient from './LoansClient';

export const dynamic = 'force-dynamic';

export default async function HRLoansPage() {
    await dbConnect();

    const [rawLoans, rawStaff, rawWallets] = await Promise.all([
        LoanAdvance.find()
            .populate('staffId', 'name department role')
            .populate('walletId', 'name')
            .sort({ createdAt: -1 })
            .lean(),
        UniversityStaff.find({ isActive: true }).sort({ name: 1 }).lean(),
        Wallet.find({ isActive: true }).sort({ name: 1 }).lean()
    ]);

    return (
        <div className="max-w-[1300px] mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Loans & Advances</h1>
                <p className="text-sm text-gray-500 mt-1">Manage staff loans, issue advances, and track deductions.</p>
            </div>

            <LoansClient
                initialLoans={JSON.parse(JSON.stringify(rawLoans))}
                staff={JSON.parse(JSON.stringify(rawStaff))}
                wallets={JSON.parse(JSON.stringify(rawWallets))}
            />
        </div>
    );
}
