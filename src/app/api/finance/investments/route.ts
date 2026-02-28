/**
 * @file /api/finance/investments/route.ts
 * @description Investment Tracking API
 *
 * POST /api/finance/investments — create investment record + record outflow
 * GET  /api/finance/investments — list investments
 * PATCH /api/finance/investments — record investment return/maturity
 */

export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import mongoose from 'mongoose';
import dbConnect from '@/lib/mongodb';
import Investment from '@/models/finance/Investment';
import { FinanceTransactionService } from '@/lib/finance/FinanceTransactionService';
import { FinanceError } from '@/lib/finance/FinanceError';

import '@/models/finance/AccountingPeriod';

export async function GET(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await dbConnect();

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const type = searchParams.get('type');
    const query: Record<string, unknown> = {};
    if (status) query.status = status;
    if (type) query.type = type;

    const investments = await Investment.find(query)
        .populate('sourceWalletId', 'name')
        .populate('returnWalletId', 'name')
        .sort({ startDate: -1 })
        .lean();

    return NextResponse.json(investments);
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await dbConnect();

    let body: {
        name: string;
        type: 'FIXED_DEPOSIT' | 'SHORT_TERM' | 'CAPITAL';
        principalAmount: number;
        sourceWalletId: string;
        returnWalletId?: string;
        interestRate?: number;
        startDate: string;
        maturityDate?: string;
        expectedReturnAmount?: number;
        notes?: string;
        recordNow?: boolean; // if true, immediately records INVESTMENT_OUTFLOW transaction
    };
    try { body = await req.json(); } catch {
        return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 });
    }

    if (!body.name || !body.type || !body.principalAmount || !body.sourceWalletId || !body.startDate) {
        return NextResponse.json({ error: 'name, type, principalAmount, sourceWalletId, startDate are required.' }, { status: 400 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recordedBy = new mongoose.Types.ObjectId((session.user as any)._id || '000000000000000000000000');
    const investmentNumber = `INV-${Date.now()}`;

    const investment = await Investment.create({
        investmentNumber,
        name: body.name,
        type: body.type,
        principalAmount: body.principalAmount,
        sourceWalletId: new mongoose.Types.ObjectId(body.sourceWalletId),
        returnWalletId: body.returnWalletId ? new mongoose.Types.ObjectId(body.returnWalletId) : undefined,
        interestRate: body.interestRate,
        startDate: new Date(body.startDate),
        maturityDate: body.maturityDate ? new Date(body.maturityDate) : undefined,
        expectedReturnAmount: body.expectedReturnAmount,
        status: 'ACTIVE',
        notes: body.notes,
        recordedBy,
    });

    // Optionally record transaction immediately
    if (body.recordNow) {
        try {
            await FinanceTransactionService.recordInvestmentOutflow({
                investmentId: investment._id.toString(),
                walletId: body.sourceWalletId,
                performedBy: recordedBy,
                date: new Date(body.startDate),
                notes: `Investment placed: ${body.name}`,
            });
        } catch (err) {
            // Rollback investment if transaction fails
            await Investment.findByIdAndDelete(investment._id);
            if (err instanceof FinanceError) return NextResponse.json(err.toJSON(), { status: 400 });
            return NextResponse.json({ error: err instanceof Error ? err.message : 'Error' }, { status: 500 });
        }
    }

    const populated = await Investment.findById(investment._id)
        .populate('sourceWalletId', 'name')
        .lean();

    return NextResponse.json(populated, { status: 201 });
}

export async function PATCH(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await dbConnect();

    let body: {
        id: string;
        action: 'RECORD_RETURN' | 'MARK_WITHDRAWN';
        actualReturnAmount?: number;
        returnWalletId?: string;
        date?: string;
        notes?: string;
    };
    try { body = await req.json(); } catch {
        return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const performedBy = (session.user as any)._id || '000000000000000000000000';

    if (body.action === 'RECORD_RETURN') {
        if (!body.actualReturnAmount || !body.returnWalletId) {
            return NextResponse.json({ error: 'actualReturnAmount and returnWalletId are required for RECORD_RETURN.' }, { status: 400 });
        }
        try {
            const result = await FinanceTransactionService.recordInvestmentReturn({
                investmentId: body.id,
                walletId: body.returnWalletId,
                actualReturnAmount: body.actualReturnAmount,
                date: body.date ? new Date(body.date) : undefined,
                notes: body.notes,
                performedBy,
            });
            return NextResponse.json({ success: true, ...result });
        } catch (err) {
            if (err instanceof FinanceError) return NextResponse.json(err.toJSON(), { status: 400 });
            return NextResponse.json({ error: err instanceof Error ? err.message : 'Error' }, { status: 500 });
        }
    }

    if (body.action === 'MARK_WITHDRAWN') {
        const updated = await Investment.findByIdAndUpdate(body.id, { status: 'WITHDRAWN', notes: body.notes }, { new: true });
        if (!updated) return NextResponse.json({ error: 'Investment not found.' }, { status: 404 });
        return NextResponse.json(updated);
    }

    return NextResponse.json({ error: 'Invalid action.' }, { status: 400 });
}
