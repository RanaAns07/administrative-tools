/* eslint-disable @typescript-eslint/no-explicit-any */
export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import dbConnect from '@/lib/mongodb';
import { withErrorHandler } from '@/lib/api-utils';

// Ensure all models needed for populate are imported
import FeeInvoice from '@/models/finance/FeeInvoice';
import FeeStructure from '@/models/finance/FeeStructure';
import StudentProfile from '@/models/university/StudentProfile';
import Batch from '@/models/university/Batch';
import Program from '@/models/university/Program';

import Wallet from '@/models/finance/Wallet';
import { FinanceTransactionService } from '@/lib/finance/FinanceTransactionService';
import { writeAuditLog } from '@/lib/finance-utils';

/**
 * GET /api/finance/fee-invoices
 * List fee invoices with optional filters.
 * Query params: studentProfileId, status, semesterNumber, page, limit
 */
export const GET = withErrorHandler(async (req: Request) => {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const studentProfileId = searchParams.get('studentProfileId');
    const status = searchParams.get('status');
    const semesterNumber = searchParams.get('semesterNumber');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    const query: Record<string, unknown> = {};
    if (studentProfileId) query.studentProfileId = studentProfileId;
    if (status) query.status = status;
    if (semesterNumber) query.semesterNumber = parseInt(semesterNumber, 10);

    console.log('DEBUG: GET /api/finance/fee-invoices', { query, page, limit });

    const [invoices, total] = await Promise.all([
        FeeInvoice.find(query)
            .populate({
                path: 'studentProfileId',
                select: 'registrationNumber name email currentSemester',
            })
            .populate({
                path: 'feeStructureId',
                select: 'semesterNumber totalAmount feeHeads',
                populate: { path: 'batchId', select: 'year season programId' },
            })
            .sort({ dueDate: 1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .lean({ virtuals: true }),
        FeeInvoice.countDocuments(query),
    ]);

    console.log(`DEBUG: Found ${invoices.length} invoices. Total: ${total}`);

    return NextResponse.json({ invoices, total, page, limit });
});

/**
 * POST /api/finance/fee-invoices
 * Create a fee invoice for a student (links StudentProfile → FeeStructure).
 *
 * Body: { studentProfileId, feeStructureId, dueDate, discountAmount?, notes? }
 *
 * NOTE: For payment collection, use POST /api/finance/fee-collection.
 */
export const POST = withErrorHandler(async (req: Request) => {
    const session = await getServerSession();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await dbConnect();
    const body = await req.json();
    const { studentProfileId, feeStructureId, dueDate, discountAmount, notes } = body;

    console.log('DEBUG: POST /api/finance/fee-invoices', { studentProfileId, feeStructureId });

    if (!studentProfileId || !feeStructureId || !dueDate) {
        return NextResponse.json(
            { error: 'studentProfileId, feeStructureId, and dueDate are required.' },
            { status: 400 }
        );
    }

    const feeStructure = await FeeStructure.findById(feeStructureId).lean();
    if (!feeStructure) return NextResponse.json({ error: 'Fee structure not found.' }, { status: 404 });

    const invoice = await FeeInvoice.create({
        studentProfileId,
        batchId: feeStructure.batchId,
        feeStructureId,
        semesterNumber: feeStructure.semesterNumber,
        dueDate: new Date(dueDate),
        totalAmount: feeStructure.totalAmount,
        discountAmount: discountAmount || 0,
        amountPaid: 0,
        penaltyAmount: 0,
        status: 'PENDING',
        notes,
    });

    await writeAuditLog({
        action: 'CREATE',
        entityType: 'FeeInvoice',
        entityId: invoice._id.toString(),
        performedBy: session.user.email || 'unknown',
        performedByName: session.user.name || undefined,
        newState: { studentProfileId, totalAmount: feeStructure.totalAmount, semesterNumber: feeStructure.semesterNumber },
    });

    // Auto-apply advance balance if available
    let advanceInfo = null;
    try {
        // Find a system default wallet (or the first bank/cash wallet) to act as standard fallback for the record
        const defaultWallet = await Wallet.findOne({ isActive: true }).lean();
        if (defaultWallet) {
            // recordAdvanceApplication internal handles availability check
            // We use a high max amount to let it deduct fully
            const result = await FinanceTransactionService.recordAdvanceApplication({
                invoiceId: invoice._id.toString(),
                amount: feeStructure.totalAmount, // Max it can apply
                walletId: defaultWallet._id.toString(),
                performedBy: session.user.id || session.user.email || 'system',
            });

            advanceInfo = {
                applied: true,
                amountApplied: result.amountApplied,
                transactionId: result.transactionId,
                newStatus: result.invoiceStatus,
            };

            // The service updates the DB but we should reflect the status in the API response
            invoice.amountPaid = result.amountApplied;
            invoice.status = result.invoiceStatus as any;
        }
    } catch (err: any) {
        // Catch INSUFFICIENT_BALANCE (from advance empty), ignoring
        if (err.code !== 'INSUFFICIENT_BALANCE') {
            console.error('Failed to auto-apply advance:', err);
            // We don't fail the invoice creation, just skip advance
        }
    }

    return NextResponse.json({ ...invoice.toObject(), advanceInfo }, { status: 201 });
});

