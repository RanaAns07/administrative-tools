/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * @file route.ts
 * @description Fee Collection API — Khatta Engine Bridge
 * @route POST /api/finance/fee-collection
 * @route GET  /api/finance/fee-collection
 *
 * This is the CRITICAL link between the University fee module and the
 * Khatta (Wallet & Transaction) cash-flow engine. This wraps FinanceTransactionService.
 */

export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import mongoose from 'mongoose';
import dbConnect from '@/lib/mongodb';
import FeeInvoice from '@/models/finance/FeeInvoice';
import { FinanceTransactionService } from '@/lib/finance/FinanceTransactionService';
import { writeAuditLog } from '@/lib/finance-utils';

// Ensure models are registered
import '@/models/finance/StudentAdvanceBalance';
import '@/models/finance/AccountingPeriod';
import '@/models/university/StudentProfile';

// ─── POST /api/finance/fee-collection ────────────────────────────────────────

export async function POST(req: Request) {
    const session = await getServerSession();
    if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    let body: {
        invoiceId: string;
        amountToPay: number;
        walletId: string;
        categoryId?: string; // Kept for backwards compatibility but not used
        notes?: string;
    };

    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
    }

    const { invoiceId, amountToPay, walletId, notes } = body;

    if (!invoiceId || !amountToPay || !walletId) {
        return NextResponse.json(
            { error: 'invoiceId, amountToPay, and walletId are required.' },
            { status: 400 }
        );
    }

    if (typeof amountToPay !== 'number' || amountToPay <= 0) {
        return NextResponse.json(
            { error: 'amountToPay must be a positive number.' },
            { status: 400 }
        );
    }

    if (!mongoose.isValidObjectId(invoiceId) || !mongoose.isValidObjectId(walletId)) {
        return NextResponse.json({ error: 'Valid ObjectIds are required.' }, { status: 400 });
    }

    try {
        const result = await FinanceTransactionService.recordFeePayment({
            invoiceId,
            amount: amountToPay,
            walletId,
            paymentMethod: 'CASH', // default for backward compat
            notes,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            performedBy: (session.user as any)._id || '000000000000000000000000',
        });

        await writeAuditLog({
            action: 'PAYMENT_RECEIVED',
            entityType: 'FeeInvoice',
            entityId: invoiceId,
            performedBy: session.user.email || 'unknown',
            newState: { amountPaid: amountToPay, status: result.invoiceStatus },
        });

        // The old UI expected `success`, `invoice.status`, `invoice.amountPaid`, `invoice.arrears`
        // We simulate it here
        const invoice = await FeeInvoice.findById(invoiceId).lean();

        return NextResponse.json(
            {
                success: true,
                ...result,
                invoice: {
                    _id: invoiceId,
                    status: result.invoiceStatus,
                    amountPaid: invoice?.amountPaid ?? 0,
                    arrears: invoice ? (invoice.totalAmount - invoice.discountAmount - invoice.discountFromAdvance + invoice.penaltyAmount - invoice.amountPaid) : 0,
                }
            },
            { status: 201 }
        );
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: err.name === 'FinanceError' ? 400 : 500 });
    }
}

// ─── GET /api/finance/fee-collection ─────────────────────────────────────────

/**
 * List fee invoices with optional filters.
 * Query params:
 *   studentProfileId  — filter by student
 *   status            — PENDING | PARTIAL | PAID | OVERDUE | WAIVED
 *   feeStructureId    — filter by batch semester
 *   semesterNumber    — filter by semester
 */
export async function GET(req: Request) {
    const session = await getServerSession();
    if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    try {
        const { searchParams } = new URL(req.url);
        const query: Record<string, unknown> = {};

        const studentProfileId = searchParams.get('studentProfileId');
        const status = searchParams.get('status');
        const feeStructureId = searchParams.get('feeStructureId');
        const semesterNumber = searchParams.get('semesterNumber');

        if (studentProfileId && mongoose.isValidObjectId(studentProfileId)) {
            query.studentProfileId = studentProfileId;
        }
        if (status) {
            query.status = status;
        }

        const search = searchParams.get('search');
        if (search) {
            const StudentProfile = mongoose.models.StudentProfile || mongoose.model('StudentProfile');
            const matchingStudents = await StudentProfile.find({
                $or: [
                    { registrationNumber: { $regex: search, $options: 'i' } },
                    { name: { $regex: search, $options: 'i' } },
                ]
            }).select('_id').lean();
            const studentIds = matchingStudents.map((s: any) => s._id);
            query.studentProfileId = { $in: studentIds };
        }
        if (feeStructureId && mongoose.isValidObjectId(feeStructureId)) {
            query.feeStructureId = feeStructureId;
        }
        if (semesterNumber) {
            query.semesterNumber = parseInt(semesterNumber, 10);
        }

        const invoices = await FeeInvoice.find(query)
            .populate({
                path: 'studentProfileId',
                select: 'registrationNumber name email currentSemester status',
                populate: {
                    path: 'batchId',
                    select: 'year season',
                    populate: { path: 'programId', select: 'name code' },
                },
            })
            .populate({
                path: 'feeStructureId',
                select: 'semesterNumber totalAmount feeHeads lateFeePerDay gracePeriodDays',
            })
            .sort({ dueDate: 1 })
            .lean({ virtuals: true });

        return NextResponse.json(invoices);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
