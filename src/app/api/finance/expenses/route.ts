/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * @file route.ts
 * @description Money-Out API — Operational Expense Recording
 * @route POST /api/finance/expenses
 * @route GET  /api/finance/expenses
 *
 * POST creates an ExpenseRecord + a Transaction(OUT) inside one Mongoose
 * session. The Transaction.pre('save') hook automatically decrements
 * Wallet.currentBalance — this route never touches the wallet directly.
 *
 * GUARD: the wallet balance is checked before opening the session to give
 * a clean 400 response instead of a mid-session abort on overspend.
 */

export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import mongoose from 'mongoose';
import dbConnect from '@/lib/mongodb';
import ExpenseRecord from '@/models/finance/ExpenseRecord';
import Transaction from '@/models/finance/Transaction';
import Wallet from '@/models/finance/Wallet';
import Category from '@/models/finance/Category';
import { writeAuditLog } from '@/lib/finance-utils';

// ─── POST /api/finance/expenses ───────────────────────────────────────────────

export async function POST(req: Request) {
    const session = await getServerSession();
    if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    let body: {
        title: string;
        categoryId: string;
        amount: number;
        walletId: string;
        receiptUrl?: string;
        notes?: string;
        date?: string;
    };

    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
    }

    const { title, categoryId, amount, walletId, receiptUrl, notes, date } = body;

    // ── Required field validation ─────────────────────────────────────────────
    if (!title || !categoryId || !amount || !walletId) {
        return NextResponse.json(
            { error: 'title, categoryId, amount, and walletId are all required.' },
            { status: 400 }
        );
    }

    if (typeof amount !== 'number' || amount <= 0) {
        return NextResponse.json(
            { error: 'amount must be a positive number.' },
            { status: 400 }
        );
    }

    if (!mongoose.isValidObjectId(categoryId)) {
        return NextResponse.json({ error: 'categoryId is not a valid ObjectId.' }, { status: 400 });
    }
    if (!mongoose.isValidObjectId(walletId)) {
        return NextResponse.json({ error: 'walletId is not a valid ObjectId.' }, { status: 400 });
    }

    // ── Pre-flight checks (outside session for fast failure) ──────────────────
    const [wallet, category] = await Promise.all([
        Wallet.findById(walletId).select('name type currentBalance isActive'),
        Category.findById(categoryId).select('name type isActive'),
    ]);

    if (!wallet || !wallet.isActive) {
        return NextResponse.json({ error: 'Wallet not found or inactive.' }, { status: 404 });
    }
    if (!category || !category.isActive) {
        return NextResponse.json({ error: 'Category not found or inactive.' }, { status: 404 });
    }
    if (category.type !== 'EXPENSE') {
        return NextResponse.json(
            {
                error: `Category "${category.name}" is of type ${category.type}. Expense records must use an EXPENSE category.`,
            },
            { status: 400 }
        );
    }

    // ── Sufficient balance guard ──────────────────────────────────────────────
    if (wallet.currentBalance < amount) {
        return NextResponse.json(
            {
                error: 'Insufficient wallet balance.',
                detail: {
                    wallet: wallet.name,
                    currentBalance: wallet.currentBalance,
                    requested: amount,
                    shortfall: amount - wallet.currentBalance,
                },
            },
            { status: 400 }
        );
    }

    // ── Resolve performedBy ObjectId ──────────────────────────────────────────
    const performedById = new mongoose.Types.ObjectId(
        (session.user as any)._id || '000000000000000000000000'
    );

    // ── Atomic session ────────────────────────────────────────────────────────
    const dbSession = await mongoose.startSession();
    dbSession.startTransaction();

    try {
        // Step 1: Create ExpenseRecord
        const [expense] = await ExpenseRecord.create(
            [
                {
                    title,
                    categoryId: new mongoose.Types.ObjectId(categoryId),
                    amount,
                    walletId: new mongoose.Types.ObjectId(walletId),
                    receiptUrl: receiptUrl || undefined,
                    date: date ? new Date(date) : new Date(),
                    notes,
                    recordedBy: performedById,
                },
            ],
            { session: dbSession }
        );

        // Step 2: Create Transaction — pre-save hook will debit the wallet
        const [transaction] = await Transaction.create(
            [
                {
                    amount,
                    type: 'OUT',
                    walletId: new mongoose.Types.ObjectId(walletId),
                    categoryId: new mongoose.Types.ObjectId(categoryId),
                    referenceType: 'EXPENSE_RECORD',
                    referenceId: expense._id.toString(),
                    notes: title,
                    performedBy: performedById,
                    date: date ? new Date(date) : new Date(),
                },
            ],
            { session: dbSession }
        );

        // Step 3: Store transactionId backref on the expense
        expense.transactionId = transaction._id as mongoose.Types.ObjectId;
        await expense.save({ session: dbSession });

        await dbSession.commitTransaction();

        // Post-commit audit (non-critical)
        await writeAuditLog({
            action: 'CREATE',
            entityType: 'ExpenseRecord',
            entityId: expense._id.toString(),
            entityReference: title,
            performedBy: session.user.email || 'unknown',
            newState: {
                amount,
                wallet: wallet.name,
                category: category.name,
                transactionId: transaction._id.toString(),
            },
        });

        return NextResponse.json(
            {
                success: true,
                expense: {
                    _id: expense._id,
                    title: expense.title,
                    amount: expense.amount,
                    date: expense.date,
                    category: category.name,
                    wallet: wallet.name,
                },
                transaction: {
                    _id: transaction._id,
                    type: transaction.type,
                    amount: transaction.amount,
                },
            },
            { status: 201 }
        );
    } catch (err: any) {
        await dbSession.abortTransaction();
        return NextResponse.json({ error: err.message }, { status: 500 });
    } finally {
        dbSession.endSession();
    }
}

// ─── GET /api/finance/expenses ────────────────────────────────────────────────

/**
 * List expense records with optional filters.
 * Query params:
 *   categoryId  — filter by expense category
 *   walletId    — filter by source wallet
 *   from        — date range start (ISO string)
 *   to          — date range end (ISO string)
 *   page        — pagination (default 1)
 *   limit       — page size (default 50)
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

        const categoryId = searchParams.get('categoryId');
        const walletId = searchParams.get('walletId');
        const from = searchParams.get('from');
        const to = searchParams.get('to');
        const page = parseInt(searchParams.get('page') || '1', 10);
        const limit = parseInt(searchParams.get('limit') || '50', 10);

        if (categoryId && mongoose.isValidObjectId(categoryId)) query.categoryId = categoryId;
        if (walletId && mongoose.isValidObjectId(walletId)) query.walletId = walletId;

        if (from || to) {
            const dateFilter: Record<string, Date> = {};
            if (from) dateFilter.$gte = new Date(from);
            if (to) dateFilter.$lte = new Date(to);
            query.date = dateFilter;
        }

        const [expenses, total] = await Promise.all([
            ExpenseRecord.find(query)
                .populate('categoryId', 'name type')
                .populate('walletId', 'name type')
                .populate('recordedBy', 'name email')
                .sort({ date: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .lean(),
            ExpenseRecord.countDocuments(query),
        ]);

        return NextResponse.json({ expenses, total, page, limit });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
