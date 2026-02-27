/* eslint-disable @typescript-eslint/no-explicit-any */
import dbConnect from '@/lib/mongodb';
import Wallet from '@/models/finance/Wallet';
import {
    Landmark, Wallet as WalletIcon, TrendingUp,
    CircleDot, ArrowUpRight,
} from 'lucide-react';
import CreateWalletModal from './CreateWalletModal';

const TYPE_META: Record<string, { label: string; icon: typeof Landmark; color: string; bg: string; ring: string }> = {
    BANK: { label: 'Bank Account', icon: Landmark, color: 'text-indigo-600', bg: 'bg-indigo-50', ring: 'ring-indigo-100' },
    CASH: { label: 'Cash in Hand', icon: WalletIcon, color: 'text-emerald-600', bg: 'bg-emerald-50', ring: 'ring-emerald-100' },
    INVESTMENT: { label: 'Investment', icon: TrendingUp, color: 'text-violet-600', bg: 'bg-violet-50', ring: 'ring-violet-100' },
};

function formatPKR(n: number) {
    return new Intl.NumberFormat('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

async function getWallets() {
    await dbConnect();
    const wallets = await Wallet.find({ isActive: true }).sort({ type: 1, name: 1 }).lean();
    return JSON.parse(JSON.stringify(wallets));
}

export default async function WalletsPage() {
    const wallets = await getWallets();

    const totalBalance = wallets.reduce((s: number, w: any) => s + (w.currentBalance || 0), 0);
    const byType = wallets.reduce((acc: Record<string, number>, w: any) => {
        acc[w.type] = (acc[w.type] || 0) + w.currentBalance;
        return acc;
    }, {});

    return (
        <div className="space-y-6 max-w-[1200px]">

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold text-leads-blue uppercase tracking-widest">Money Management</span>
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Wallets</h1>
                    <p className="text-sm text-gray-400 mt-0.5">{wallets.length} active wallet{wallets.length !== 1 ? 's' : ''}</p>
                </div>
                <CreateWalletModal />
            </div>

            {/* Total balance hero */}
            <div className="bg-gradient-to-br from-leads-blue to-indigo-700 rounded-2xl p-6 text-white shadow-lg">
                <p className="text-sm font-medium text-indigo-200 mb-1">Total Liquid Assets</p>
                <p className="text-4xl font-bold tracking-tight">
                    PKR <span>{formatPKR(totalBalance)}</span>
                </p>
                <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-white/20">
                    {Object.entries(byType).map(([type, total]) => {
                        const meta = TYPE_META[type];
                        return (
                            <div key={type} className="text-sm">
                                <p className="text-indigo-200 text-xs">{meta?.label || type}</p>
                                <p className="font-semibold">PKR {formatPKR(total as number)}</p>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Wallet cards */}
            {wallets.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
                    <WalletIcon size={36} className="text-gray-200 mx-auto mb-3" />
                    <p className="text-gray-500 font-medium">No wallets yet</p>
                    <p className="text-sm text-gray-400 mt-1">Create a wallet to start tracking money movement.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {wallets.map((wallet: any) => {
                        const meta = TYPE_META[wallet.type] ?? TYPE_META.CASH;
                        const Icon = meta.icon;
                        const isNegative = wallet.currentBalance < 0;
                        return (
                            <div
                                key={wallet._id}
                                className={`bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-4 hover:shadow-md transition-shadow ring-1 ${meta.ring}`}
                            >
                                {/* Top row */}
                                <div className="flex items-start justify-between">
                                    <div className={`p-2.5 rounded-xl ${meta.bg} ${meta.color}`}>
                                        <Icon size={20} />
                                    </div>
                                    <span className={`flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${meta.bg} ${meta.color}`}>
                                        <CircleDot size={8} />
                                        {meta.label}
                                    </span>
                                </div>

                                {/* Name */}
                                <div>
                                    <p className="text-base font-semibold text-gray-900 leading-tight">{wallet.name}</p>
                                    <p className="text-xs text-gray-400 mt-0.5">{wallet.currency}</p>
                                </div>

                                {/* Balance */}
                                <div className="pt-3 border-t border-gray-100">
                                    <p className="text-xs text-gray-400 mb-0.5">Current Balance</p>
                                    <p className={`text-2xl font-bold tracking-tight ${isNegative ? 'text-rose-600' : 'text-gray-900'}`}>
                                        PKR {formatPKR(wallet.currentBalance)}
                                    </p>
                                </div>

                                {/* View transactions link */}
                                <a
                                    href={`/finance/transactions?walletId=${wallet._id}`}
                                    className="flex items-center gap-1 text-xs text-leads-blue hover:underline mt-auto"
                                >
                                    View transactions <ArrowUpRight size={11} />
                                </a>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
