/**
 * @file /api/finance/refunds/route.ts
 * @description Refund API — delegates to FinanceTransactionService
 */

export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import mongoose from 'mongoose';
import dbConnect from '@/lib/mongodb';
import Refund from '@/models/finance/Refund';
import { FinanceTransactionService } from '@/lib/finance/FinanceTransactionService';
import { FinanceError } from '@/lib/finance/FinanceError';

import '@/models/finance/AccountingPeriod';
import '@/models/finance/SecurityDeposit';

export async function GET(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await dbConnect();

    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get('studentId');
    const refundType = searchParams.get('refundType');
    const query: Record<string, unknown> = {};
    if (studentId && mongoose.isValidObjectId(studentId)) query.studentProfileId = studentId;
    if (refundType) query.refundType = refundType;

    const refunds = await Refund.find(query)
        .populate('studentProfileId', 'name registrationNumber')
        .populate('walletId', 'name')
        .populate('processedBy', 'name email')
        .sort({ processedAt: -1 })
        .lean();

    return NextResponse.json(refunds);
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await dbConnect();

    let body: {
        studentProfileId: string;
        refundType: 'OVERPAYMENT' | 'SECURITY_DEPOSIT' | 'ADMISSION_CANCEL' | 'ADJUSTMENT';
        amount: number;
        walletId: string;
        reason: string;
        sourceInvoiceId?: string;
        securityDepositId?: string;
        date?: string;
        notes?: string;
    };
    try { body = await req.json(); } catch {
        return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 });
    }

    if (!body.studentProfileId || !body.refundType || !body.amount || !body.walletId || !body.reason) {
        return NextResponse.json({ error: 'studentProfileId, refundType, amount, walletId, reason are required.' }, { status: 400 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const performedBy = (session.user as any)._id || '000000000000000000000000';

    try {
        const result = await FinanceTransactionService.recordRefund({
            ...body,
            date: body.date ? new Date(body.date) : undefined,
            performedBy,
        });
        return NextResponse.json({ success: true, ...result }, { status: 201 });
    } catch (err) {
        if (err instanceof FinanceError) return NextResponse.json(err.toJSON(), { status: 400 });
        return NextResponse.json({ error: err instanceof Error ? err.message : 'Error' }, { status: 500 });
    }
}
