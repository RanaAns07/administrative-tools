/**
 * @file route.ts
 * @description Fee Collection API — Khatta Engine Bridge
 * @route POST /api/finance/fee-collection
 * @route GET  /api/finance/fee-collection
 *
 * This is the CRITICAL link between the University fee module and the
 * Khatta (Wallet & Transaction) cash-flow engine.
 *
 * PAYMENT FLOW (POST):
 *   1. Validate the FeeInvoice (exists, not already paid, amount valid)
 *   2. Compute late penalty if payment is after the due date
 *   3. Open a Mongoose session (atomic: both steps succeed or both fail)
 *   4. Update FeeInvoice.amountPaid — pre-save hook handles status transition
 *   5. Create a Transaction (type: 'IN') — pre-save hook updates Wallet balance
 *   → Wallet.currentBalance is NEVER touched directly in this route.
 */

export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import mongoose from 'mongoose';
import dbConnect from '@/lib/mongodb';
import FeeInvoice from '@/models/finance/FeeInvoice';
import Transaction from '@/models/finance/Transaction';
import Wallet from '@/models/finance/Wallet';
import Category from '@/models/finance/Category';
import StudentProfile from '@/models/university/StudentProfile';
import { writeAuditLog } from '@/lib/finance-utils';

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
        categoryId: string;
        notes?: string;
    };

    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
    }

    const { invoiceId, amountToPay, walletId, categoryId, notes } = body;

    // ── Input validation ─────────────────────────────────────────────────────
    if (!invoiceId || !amountToPay || !walletId || !categoryId) {
        return NextResponse.json(
            { error: 'invoiceId, amountToPay, walletId, and categoryId are all required.' },
            { status: 400 }
        );
    }

    if (typeof amountToPay !== 'number' || amountToPay <= 0) {
        return NextResponse.json(
            { error: 'amountToPay must be a positive number.' },
            { status: 400 }
        );
    }

    if (!mongoose.isValidObjectId(invoiceId)) {
        return NextResponse.json({ error: 'invoiceId is not a valid ObjectId.' }, { status: 400 });
    }
    if (!mongoose.isValidObjectId(walletId)) {
        return NextResponse.json({ error: 'walletId is not a valid ObjectId.' }, { status: 400 });
    }
    if (!mongoose.isValidObjectId(categoryId)) {
        return NextResponse.json({ error: 'categoryId is not a valid ObjectId.' }, { status: 400 });
    }

    // ── Fetch supporting documents (outside session for read speed) ───────────
    const [invoice, wallet, category] = await Promise.all([
        FeeInvoice.findById(invoiceId),
        Wallet.findById(walletId).select('name type isActive'),
        Category.findById(categoryId).select('name type isActive'),
    ]);

    if (!invoice) {
        return NextResponse.json({ error: 'Fee invoice not found.' }, { status: 404 });
    }
    if (invoice.status === 'PAID') {
        return NextResponse.json({ error: 'This invoice is already fully paid.' }, { status: 409 });
    }
    if (invoice.status === 'WAIVED') {
        return NextResponse.json({ error: 'This invoice has been waived — no payment required.' }, { status: 409 });
    }
    if (!wallet || !wallet.isActive) {
        return NextResponse.json({ error: 'Wallet not found or inactive.' }, { status: 404 });
    }
    if (!category || !category.isActive) {
        return NextResponse.json({ error: 'Category not found or inactive.' }, { status: 404 });
    }
    if (category.type !== 'INCOME') {
        return NextResponse.json(
            { error: `Category "${category.name}" is of type ${category.type}. Fee payments must use an INCOME category.` },
            { status: 400 }
        );
    }

    // ── Amount cap validation ─────────────────────────────────────────────────
    const effectiveTotal = invoice.totalAmount - invoice.discountAmount;
    const remainingBalance = effectiveTotal + invoice.penaltyAmount - invoice.amountPaid;

    if (amountToPay > remainingBalance) {
        return NextResponse.json(
            {
                error: 'Payment amount exceeds outstanding balance.',
                detail: {
                    totalAmount: invoice.totalAmount,
                    discountAmount: invoice.discountAmount,
                    penaltyAmount: invoice.penaltyAmount,
                    amountPaid: invoice.amountPaid,
                    remainingBalance: Math.max(0, remainingBalance),
                    amountToPay,
                },
            },
            { status: 400 }
        );
    }

    // ── Compute late penalty (if applicable) ──────────────────────────────────
    let latePenalty = 0;
    const feeStructure = await invoice.populate<{ feeStructureId: { lateFeePerDay: number; gracePeriodDays: number } }>('feeStructureId');
    const structure = (feeStructure.feeStructureId as any);

    if (structure) {
        const now = new Date();
        const graceDeadline = new Date(invoice.dueDate);
        graceDeadline.setDate(graceDeadline.getDate() + (structure.gracePeriodDays || 0));

        if (now > graceDeadline && structure.lateFeePerDay > 0) {
            const daysLate = Math.ceil(
                (now.getTime() - graceDeadline.getTime()) / (1000 * 60 * 60 * 24)
            );
            // Only add penalty if it hasn't already been added
            const expectedPenalty = daysLate * structure.lateFeePerDay;
            if (expectedPenalty > invoice.penaltyAmount) {
                latePenalty = expectedPenalty - invoice.penaltyAmount;
            }
        }
    }

    // ── Atomic transaction (Mongoose session) ─────────────────────────────────
    const dbSession = await mongoose.startSession();
    dbSession.startTransaction();

    try {
        // Step 1: Update the FeeInvoice
        invoice.amountPaid = invoice.amountPaid + amountToPay;
        if (latePenalty > 0) {
            invoice.penaltyAmount = invoice.penaltyAmount + latePenalty;
        }
        if (notes) invoice.notes = notes;
        // The pre-save hook automatically updates invoice.status — do NOT set it manually.
        await invoice.save({ session: dbSession });

        // Step 2: Create the Transaction (Khatta engine)
        // The Transaction.pre('save') hook will call Wallet.findByIdAndUpdate($inc)
        // to update the wallet balance. We do NOT do it here.
        const [transaction] = await Transaction.create(
            [
                {
                    amount: amountToPay,
                    type: 'IN',
                    walletId: new mongoose.Types.ObjectId(walletId),
                    categoryId: new mongoose.Types.ObjectId(categoryId),
                    referenceType: 'FEE_INVOICE',
                    referenceId: invoice._id.toString(),
                    notes: notes || `Fee payment for invoice ${invoice._id}`,
                    performedBy: new mongoose.Types.ObjectId(
                        // Fall back to a placeholder if the session user has no _id
                        // (real auth should always provide this)
                        (session.user as any)._id || '000000000000000000000000'
                    ),
                },
            ],
            { session: dbSession }
        );

        await dbSession.commitTransaction();

        // ── Post-commit: audit log (non-critical, runs outside session) ────────
        await writeAuditLog({
            action: 'PAYMENT_RECEIVED',
            entityType: 'FeeInvoice',
            entityId: invoice._id.toString(),
            performedBy: session.user.email || 'unknown',
            performedByName: session.user.name || undefined,
            newState: {
                amountPaid: invoice.amountPaid,
                status: invoice.status,
                transactionId: transaction._id.toString(),
                wallet: wallet.name,
            },
        });

        return NextResponse.json(
            {
                success: true,
                invoice: {
                    _id: invoice._id,
                    status: invoice.status,
                    amountPaid: invoice.amountPaid,
                    arrears: invoice.arrears,
                    penaltyAmount: invoice.penaltyAmount,
                    latePenaltyAddedThisPayment: latePenalty,
                },
                transaction: {
                    _id: transaction._id,
                    amount: transaction.amount,
                    type: transaction.type,
                    wallet: wallet.name,
                    category: category.name,
                },
            },
            { status: 201 }
        );
    } catch (err: any) {
        await dbSession.abortTransaction();
        throw err;
    } finally {
        dbSession.endSession();
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
