/**
 * @file /api/finance/wallet-transfers/route.ts
 * @description Internal Wallet Transfer API
 *
 * Transfers money between two university wallets.
 * Creates two linked transactions (WALLET_TRANSFER_OUT + WALLET_TRANSFER_IN)
 * inside one atomic MongoDB session via FinanceTransactionService.
 */

export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import mongoose from 'mongoose';
import dbConnect from '@/lib/mongodb';
import { FinanceTransactionService } from '@/lib/finance/FinanceTransactionService';
import { FinanceError } from '@/lib/finance/FinanceError';
import { writeAuditLog } from '@/lib/finance-utils';

import '@/models/finance/AccountingPeriod';

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await dbConnect();

    let body: {
        fromWalletId: string;
        toWalletId: string;
        amount: number;
        date?: string;
        notes?: string;
    };

    try { body = await req.json(); } catch {
        return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
    }

    const { fromWalletId, toWalletId, amount, date, notes } = body;

    if (!fromWalletId || !toWalletId || !amount) {
        return NextResponse.json({ error: 'fromWalletId, toWalletId, and amount are required.' }, { status: 400 });
    }
    if (!mongoose.isValidObjectId(fromWalletId) || !mongoose.isValidObjectId(toWalletId)) {
        return NextResponse.json({ error: 'fromWalletId and toWalletId must be valid ObjectIds.' }, { status: 400 });
    }
    if (fromWalletId === toWalletId) {
        return NextResponse.json({ error: 'fromWalletId and toWalletId must be different wallets.' }, { status: 400 });
    }
    if (typeof amount !== 'number' || amount <= 0) {
        return NextResponse.json({ error: 'amount must be a positive number.' }, { status: 400 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const performedBy = (session.user as any)._id || '000000000000000000000000';

    try {
        const result = await FinanceTransactionService.recordTransfer({
            fromWalletId,
            toWalletId,
            amount,
            date: date ? new Date(date) : undefined,
            notes,
            performedBy,
        });

        await writeAuditLog({
            action: 'WALLET_TRANSFER',
            entityType: 'Transaction',
            entityId: result.outTxId,
            performedBy: session.user.email || 'unknown',
            newState: { fromWalletId, toWalletId, amount, outTxId: result.outTxId, inTxId: result.inTxId },
        });

        return NextResponse.json({ success: true, ...result }, { status: 201 });
    } catch (err) {
        if (err instanceof FinanceError) return NextResponse.json(err.toJSON(), { status: 400 });
        return NextResponse.json({ error: err instanceof Error ? err.message : 'Error' }, { status: 500 });
    }
}
