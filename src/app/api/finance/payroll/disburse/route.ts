/**
 * @file /api/finance/payroll/disburse/route.ts
 * @description Payroll Disbursement — one slip at a time via service
 *
 * Each salary slip is disbursed individually through FinanceTransactionService.
 * Supports batch disbursement (array of slipIds) in a loop inside a single request.
 * Each slip has its OWN session — so a failure on one slip doesn't block others
 * (partial disbursement is allowed; caller retries the failed ones).
 */

export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import mongoose from 'mongoose';
import dbConnect from '@/lib/mongodb';
import SalarySlip from '@/models/finance/SalarySlip';
import Wallet from '@/models/finance/Wallet';
import { FinanceTransactionService } from '@/lib/finance/FinanceTransactionService';
import { FinanceError } from '@/lib/finance/FinanceError';
import { writeAuditLog } from '@/lib/finance-utils';

import '@/models/finance/AccountingPeriod';
import '@/models/finance/UniversityStaff';

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await dbConnect();

    let body: { slipIds: string[]; walletId: string };
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
    }

    const { slipIds, walletId } = body;

    if (!slipIds || !Array.isArray(slipIds) || slipIds.length === 0) {
        return NextResponse.json({ error: 'slipIds must be a non-empty array.' }, { status: 400 });
    }
    if (!walletId || !mongoose.isValidObjectId(walletId)) {
        return NextResponse.json({ error: 'A valid walletId is required.' }, { status: 400 });
    }

    // Pre-flight: check wallet exists and has sufficient balance
    const totalSlips = await SalarySlip.find({
        _id: { $in: slipIds.map(id => new mongoose.Types.ObjectId(id)) },
        status: 'DRAFT',
    }).select('netPayable baseAmount allowances deductions').lean();

    if (totalSlips.length === 0) {
        return NextResponse.json({ error: 'No DRAFT salary slips found for the provided IDs.' }, { status: 404 });
    }

    const totalRequired = totalSlips.reduce((sum, s) =>
        sum + Math.max(0, s.baseAmount + s.allowances - s.deductions), 0);

    const wallet = await Wallet.findById(walletId).select('name currentBalance isActive').lean();
    if (!wallet || !wallet.isActive) {
        return NextResponse.json({ error: 'Wallet not found or inactive.' }, { status: 404 });
    }
    if (wallet.currentBalance < totalRequired) {
        return NextResponse.json({
            error: 'Insufficient wallet balance.',
            detail: {
                wallet: wallet.name,
                available: wallet.currentBalance,
                required: totalRequired,
                shortfall: totalRequired - wallet.currentBalance,
            },
        }, { status: 400 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const performedBy = (session.user as any)._id || '000000000000000000000000';

    const disbursed: Array<{ slipId: string; netPayable: number; transactionId: string }> = [];
    const failed: Array<{ slipId: string; error: string }> = [];

    for (const slipId of slipIds) {
        try {
            const result = await FinanceTransactionService.recordSalaryDisbursement({
                slipId,
                walletId,
                performedBy,
            });
            disbursed.push({ slipId, ...result });
        } catch (err) {
            const msg = err instanceof FinanceError ? err.message : (err instanceof Error ? err.message : 'Unknown error');
            failed.push({ slipId, error: msg });
        }
    }

    const totalPaid = disbursed.reduce((sum, d) => sum + d.netPayable, 0);

    await writeAuditLog({
        action: 'PAYROLL_DISBURSED',
        entityType: 'SalarySlip',
        entityId: slipIds[0],
        performedBy: session.user.email || 'unknown',
        newState: { disbursedCount: disbursed.length, failedCount: failed.length, totalPaid, walletId },
    });

    return NextResponse.json({
        success: true,
        summary: {
            requested: slipIds.length,
            disbursed: disbursed.length,
            failed: failed.length,
            totalNetPaid: totalPaid,
        },
        disbursed,
        ...(failed.length > 0 ? { failed } : {}),
    });
}
