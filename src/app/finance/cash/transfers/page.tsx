/* eslint-disable @typescript-eslint/no-explicit-any */
import dbConnect from '@/lib/mongodb';
import Wallet from '@/models/finance/Wallet';
import CashTransfersClient from './CashTransfersClient';

export const dynamic = 'force-dynamic';

export default async function CashTransfersPage() {
    await dbConnect();
    const rawWallets = await Wallet.find({ isActive: true }).sort({ name: 1 }).lean();
    const wallets = JSON.parse(JSON.stringify(rawWallets));

    return (
        <div className="max-w-[1100px] mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Wallet Transfers</h1>
                <p className="text-sm text-gray-500 mt-1">Move funds between bank accounts, cash boxes, or investment accounts.</p>
            </div>
            <CashTransfersClient wallets={wallets} />
        </div>
    );
}
