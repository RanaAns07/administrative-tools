/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * @file route.ts
 * @description Payroll Disbursement API — Batch Salary Payment
 * @route POST /api/finance/payroll/disburse
 *
 * Allows a finance officer to pay multiple salary slips in one click.
 *
 * FLOW:
 *   1. Fetch all SalarySlip docs where _id ∈ slipIds AND status === 'DRAFT'
 *   2. Sum netPayable of fetched slips
 *   3. Guard: wallet.currentBalance ≥ total
 *   4. Open Mongoose session:
 *      a. Mark all slips PAID + set paidDate
 *      b. For each slip, create one Transaction(OUT)
 *         → Transaction.pre('save) decrements Wallet.currentBalance
 *      c. Store transactionId backref on each slip
 *   5. Commit. On any error → abort (all-or-nothing).
 *
 * NOTE: One Transaction is created per slip (not one bulk transaction)
 * so each payment is individually auditable and reversible.
 */

export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import mongoose from 'mongoose';
import dbConnect from '@/lib/mongodb';
import SalarySlip from '@/models/finance/SalarySlip';
import Transaction from '@/models/finance/Transaction';
import Wallet from '@/models/finance/Wallet';
import Category from '@/models/finance/Category';
import { writeAuditLog } from '@/lib/finance-utils';

// ─── POST /api/finance/payroll/disburse ───────────────────────────────────────

export async function POST(req: Request) {
    const session = await getServerSession();
    if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    let body: { slipIds: string[]; walletId: string; categoryId?: string };

    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
    }

    const { slipIds, walletId, categoryId } = body;

    // ── Input validation ─────────────────────────────────────────────────────
    if (!slipIds || !Array.isArray(slipIds) || slipIds.length === 0) {
        return NextResponse.json(
            { error: 'slipIds must be a non-empty array of SalarySlip IDs.' },
            { status: 400 }
        );
    }
    if (!walletId) {
        return NextResponse.json(
            { error: 'walletId is required.' },
            { status: 400 }
        );
    }
    if (!mongoose.isValidObjectId(walletId)) {
        return NextResponse.json({ error: 'walletId is not a valid ObjectId.' }, { status: 400 });
    }

    const invalidIds = slipIds.filter((id) => !mongoose.isValidObjectId(id));
    if (invalidIds.length > 0) {
        return NextResponse.json(
            { error: `Invalid slip IDs: ${invalidIds.join(', ')}` },
            { status: 400 }
        );
    }

    // ── Fetch slips and wallet ─────────────────────────────────────────────────
    const [slips, wallet] = await Promise.all([
        SalarySlip.find({
            _id: { $in: slipIds.map((id) => new mongoose.Types.ObjectId(id)) },
            status: 'DRAFT',
        }).populate('staffId', 'name role'),
        Wallet.findById(walletId).select('name type currentBalance isActive'),
    ]);

    if (!wallet || !wallet.isActive) {
        return NextResponse.json({ error: 'Wallet not found or inactive.' }, { status: 404 });
    }

    if (slips.length === 0) {
        return NextResponse.json(
            {
                error: 'No DRAFT salary slips found for the provided IDs.',
                detail: 'Slips may already be PAID or VOID, or the IDs are incorrect.',
            },
            { status: 404 }
        );
    }

    // Warn if some IDs were skipped (already paid or not found)
    const foundIds = slips.map((s) => s._id.toString());
    const skippedIds = slipIds.filter((id) => !foundIds.includes(id));

    // ── Total & balance guard ─────────────────────────────────────────────────
    const totalNetPayable = slips.reduce((sum, slip) => sum + slip.netPayable, 0);

    if (wallet.currentBalance < totalNetPayable) {
        return NextResponse.json(
            {
                error: 'Insufficient wallet balance for this payroll disbursement.',
                detail: {
                    wallet: wallet.name,
                    currentBalance: wallet.currentBalance,
                    totalRequired: totalNetPayable,
                    shortfall: totalNetPayable - wallet.currentBalance,
                    slipCount: slips.length,
                },
            },
            { status: 400 }
        );
    }

    // ── Resolve salary expense category ──────────────────────────────────────
    // Use provided categoryId, or fall back to first active EXPENSE category
    // named 'Faculty Salary' or 'Administrative Salary'.
    let salaryCategory = categoryId
        ? await Category.findById(categoryId).select('name type isActive')
        : await Category.findOne({ type: 'EXPENSE', isActive: true, name: /salary/i }).select('name type isActive');

    if (!salaryCategory) {
        salaryCategory = await Category.findOne({ type: 'EXPENSE', isActive: true }).select('name type isActive');
    }

    if (!salaryCategory) {
        return NextResponse.json(
            { error: 'No active EXPENSE category found. Please create one in /api/finance/categories first.' },
            { status: 400 }
        );
    }

    if (salaryCategory.type !== 'EXPENSE') {
        return NextResponse.json(
            { error: `Category "${salaryCategory.name}" is not an EXPENSE category.` },
            { status: 400 }
        );
    }

    // ── Resolve performedBy ───────────────────────────────────────────────────
    const performedById = new mongoose.Types.ObjectId(
        (session.user as any)._id || '000000000000000000000000'
    );

    const paidDate = new Date();

    // ── Atomic session: mark paid + create transactions ───────────────────────
    const dbSession = await mongoose.startSession();
    dbSession.startTransaction();

    const disbursed: Array<{ slipId: string; staffName: string; netPayable: number; transactionId: string }> = [];

    try {
        for (const slip of slips) {
            const staff = slip.staffId as any;
            const staffName = staff?.name || 'Unknown';
            const monthName = new Date(slip.year, slip.month - 1).toLocaleString('default', { month: 'long' });

            // Create one Transaction per slip
            const [transaction] = await Transaction.create(
                [
                    {
                        amount: slip.netPayable,
                        type: 'OUT',
                        walletId: new mongoose.Types.ObjectId(walletId),
                        categoryId: salaryCategory!._id,
                        referenceType: 'PAYROLL_SLIP',
                        referenceId: slip._id.toString(),
                        notes: `Salary — ${staffName} (${monthName} ${slip.year})`,
                        performedBy: performedById,
                        date: paidDate,
                    },
                ],
                { session: dbSession }
            );

            // Mark slip as paid
            slip.status = 'PAID';
            slip.paidDate = paidDate;
            slip.transactionId = transaction._id as mongoose.Types.ObjectId;
            await slip.save({ session: dbSession });

            disbursed.push({
                slipId: slip._id.toString(),
                staffName,
                netPayable: slip.netPayable,
                transactionId: transaction._id.toString(),
            });
        }

        await dbSession.commitTransaction();

        // Post-commit audit
        await writeAuditLog({
            action: 'PROCESS_PAYROLL',
            entityType: 'SalarySlip',
            entityId: slips[0]._id.toString(), // representative ID for the batch
            performedBy: session.user.email || 'unknown',
            newState: {
                slipCount: slips.length,
                totalNetPayable,
                wallet: wallet.name,
                category: salaryCategory.name,
            },
        });

        return NextResponse.json(
            {
                success: true,
                summary: {
                    slipsDisbursed: slips.length,
                    slipsSkipped: skippedIds.length,
                    skippedIds,
                    totalNetPayable,
                    wallet: wallet.name,
                    paidDate: paidDate.toISOString(),
                },
                disbursed,
            },
            { status: 200 }
        );
    } catch (err: any) {
        await dbSession.abortTransaction();
        return NextResponse.json({ error: err.message }, { status: 500 });
    } finally {
        dbSession.endSession();
    }
}
