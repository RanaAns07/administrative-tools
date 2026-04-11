/**
 * @file /api/finance/fee-payments/route.ts
 * @description Fee Payment API — delegates entirely to FinanceTransactionService
 *
 * This route is a THIN WRAPPER. Zero business logic here.
 * All financial mutations happen in FinanceTransactionService.recordFeePayment().
 */

export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import mongoose from 'mongoose';
import dbConnect from '@/lib/mongodb';
import { withErrorHandler } from '@/lib/api-utils';
import FeeInvoice from '@/models/finance/FeeInvoice';
import FeePayment from '@/models/finance/FeePayment';
import { FinanceTransactionService } from '@/lib/finance/FinanceTransactionService';
import { FinanceError } from '@/lib/finance/FinanceError';
import { writeAuditLog } from '@/lib/finance-utils';

// Ensure models are registered
import '@/models/finance/StudentAdvanceBalance';
import '@/models/finance/AccountingPeriod';

// ── POST /api/finance/fee-payments ────────────────────────────────────────────

export const POST = withErrorHandler(async (req: Request) => {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await dbConnect();

    let body: {
        invoiceId: string;
        amount: number;
        walletId: string;
        paymentMethod: 'CASH' | 'BANK_TRANSFER' | 'CHEQUE' | 'ONLINE';
        chequeNumber?: string;
        bankRef?: string;
        date?: string;
        notes?: string;
    };

    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
    }

    const { invoiceId, amount, walletId, paymentMethod, chequeNumber, bankRef, date, notes } = body;

    console.log('DEBUG: POST /api/finance/fee-payments', { invoiceId, amount, walletId });

    if (!invoiceId || !walletId || !paymentMethod) {
        return NextResponse.json({ error: 'invoiceId, walletId, and paymentMethod are required.' }, { status: 400 });
    }
    if (typeof amount !== 'number' || amount < 0) {
        return NextResponse.json({ error: 'amount must be a non-negative number.' }, { status: 400 });
    }
    if (!mongoose.isValidObjectId(invoiceId) || !mongoose.isValidObjectId(walletId)) {
        return NextResponse.json({ error: 'invoiceId and walletId must be valid ObjectIds.' }, { status: 400 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const performedBy = (session.user as any)._id || '000000000000000000000000';

    try {
        const result = await FinanceTransactionService.recordFeePayment({
            invoiceId,
            amount,
            walletId,
            paymentMethod,
            chequeNumber,
            bankRef,
            date: date ? new Date(date) : undefined,
            notes,
            performedBy,
        });

        await writeAuditLog({
            action: 'FEE_PAYMENT_RECORDED',
            entityType: 'FeeInvoice',
            entityId: invoiceId,
            entityReference: result.receiptNumber,
            performedBy: session.user.email || 'unknown',
            newState: {
                amount,
                advanceApplied: result.advanceApplied,
                excessCredited: result.excessCredited,
                invoiceStatus: result.invoiceStatus,
            },
        });

        return NextResponse.json({ success: true, ...result }, { status: 201 });
    } catch (err) {
        if (err instanceof FinanceError) {
            return NextResponse.json(err.toJSON(), { status: 400 });
        }
        throw err; // Re-throw to be handled by withErrorHandler
    }
});

// ── GET /api/finance/fee-payments ─────────────────────────────────────────────

export const GET = withErrorHandler(async (req: Request) => {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await dbConnect();

    const { searchParams } = new URL(req.url);
    const invoiceId = searchParams.get('invoiceId');
    const studentId = searchParams.get('studentId');
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const query: Record<string, unknown> = {};
    if (invoiceId && mongoose.isValidObjectId(invoiceId)) query.feeInvoice = invoiceId;
    if (status) query.status = status;

    console.log('DEBUG: GET /api/finance/fee-payments', { query, studentId });

    if (studentId && mongoose.isValidObjectId(studentId)) {
        const invoices = await FeeInvoice.find({ studentProfileId: studentId }).select('_id').lean();
        query.feeInvoice = { $in: invoices.map(i => i._id) };
    }

    const [payments, total] = await Promise.all([
        FeePayment.find(query)
            .populate({
                path: 'feeInvoice',
                select: 'invoiceNumber invoiceType studentProfileId',
                populate: {
                    path: 'studentProfileId',
                    select: 'name registrationNumber'
                }
            })
            .sort({ paymentDate: -1, createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .lean(),
        FeePayment.countDocuments(query),
    ]);

    console.log(`DEBUG: Found ${payments.length} payments`);

    return NextResponse.json({ payments, total, page, limit });
});

