/* eslint-disable @typescript-eslint/no-explicit-any */
export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import dbConnect from '@/lib/mongodb';
import Wallet from '@/models/finance/Wallet';
import { writeAuditLog } from '@/lib/finance-utils';

/**
 * GET /api/finance/wallets
 * List all active wallets
 */
export async function GET() {
    try {
        await dbConnect();

        // Return active wallets, sorted by name
        const wallets = await Wallet.find({ isActive: true })
            .sort({ name: 1 })
            .lean();

        return NextResponse.json(wallets);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

/**
 * POST /api/finance/wallets
 * Create a new wallet
 * Body: { name: string, type: 'BANK' | 'CASH' | 'INVESTMENT', currency?: string }
 */
export async function POST(req: Request) {
    try {
        const session = await getServerSession();
        if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        await dbConnect();
        const body = await req.json();
        const { name, type, currency = 'PKR' } = body;

        if (!name || typeof name !== 'string') {
            return NextResponse.json({ error: 'Wallet name is required' }, { status: 400 });
        }

        if (!['BANK', 'CASH', 'INVESTMENT'].includes(type)) {
            return NextResponse.json({ error: 'Valid wallet type (BANK, CASH, INVESTMENT) is required' }, { status: 400 });
        }

        const wallet = await Wallet.create({
            name: name.trim(),
            type,
            currency: currency.trim() || 'PKR',
            currentBalance: 0, // Always starts at 0
            isActive: true,
        });

        await writeAuditLog({
            action: 'CREATE',
            entityType: 'Wallet',
            entityId: wallet._id.toString(),
            entityReference: wallet.name,
            performedBy: session.user.email || 'unknown',
            newState: { name: wallet.name, type: wallet.type, currency: wallet.currency },
        });

        return NextResponse.json(wallet, { status: 201 });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
