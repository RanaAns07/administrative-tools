import dbConnect from '@/lib/mongodb';
import Refund from '@/models/finance/Refund';
import Wallet from '@/models/finance/Wallet';
import RefundsClient from './RefundsClient';
import '@/models/university/StudentProfile'; // Explicit association load

export const dynamic = 'force-dynamic';

export default async function FeeRefundsPage() {
    await dbConnect();

    // Fetch recent refunds securely from server
    const rawRefunds = await Refund.find({})
        .populate('studentProfileId', 'name registrationNumber')
        .populate('walletId', 'name')
        .populate('processedBy', 'name email')
        .sort({ processedAt: -1 })
        .limit(100)
        .lean();

    // Fetch active wallets for processing refunds
    const wallets = await Wallet.find({ isActive: true }).sort({ name: 1 }).lean();

    return (
        <div className="max-w-[1200px] mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Refunds Management</h1>
                <p className="text-sm text-gray-500 mt-1">
                    Process and track fee refunds for students, including overpayments, security deposits, and adjustments.
                </p>
            </div>

            <RefundsClient
                initialRefunds={JSON.parse(JSON.stringify(rawRefunds))}
                wallets={JSON.parse(JSON.stringify(wallets))}
            />
        </div>
    );
}
