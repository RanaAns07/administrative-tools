/**
 * @file /api/finance/expenses/route.ts  
 * @description Expense API — delegates to FinanceTransactionService
 *
 * Thin wrapper. Business rules enforced in the service.
 */

export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import mongoose from 'mongoose';
import dbConnect from '@/lib/mongodb';
import ExpenseRecord from '@/models/finance/ExpenseRecord';
import Category from '@/models/finance/Category';
import Wallet from '@/models/finance/Wallet';
import { FinanceTransactionService } from '@/lib/finance/FinanceTransactionService';
import { FinanceError } from '@/lib/finance/FinanceError';
import { writeAuditLog } from '@/lib/finance-utils';

import '@/models/finance/AccountingPeriod';

// ── POST /api/finance/expenses ────────────────────────────────────────────────

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await dbConnect();

    let body: {
        title: string;
        categoryId: string;
        amount: number;
        walletId: string;
        vendorId?: string;
        department?: string;
        receiptUrl?: string;
        notes?: string;
        date?: string;
    };

    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
    }

    const { title, categoryId, amount, walletId, vendorId, department, receiptUrl, notes, date } = body;

    if (!title || !categoryId || !walletId) {
        return NextResponse.json({ error: 'title, categoryId, and walletId are required.' }, { status: 400 });
    }
    if (typeof amount !== 'number' || amount <= 0) {
        return NextResponse.json({ error: 'amount must be a positive number.' }, { status: 400 });
    }
    if (!mongoose.isValidObjectId(categoryId) || !mongoose.isValidObjectId(walletId)) {
        return NextResponse.json({ error: 'categoryId and walletId must be valid ObjectIds.' }, { status: 400 });
    }

    // Pre-flight: validate expense category type
    const category = await Category.findById(categoryId).select('name type isActive').lean();
    if (!category || !category.isActive) {
        return NextResponse.json({ error: 'Category not found or inactive.' }, { status: 404 });
    }
    if (category.type !== 'EXPENSE') {
        return NextResponse.json({ error: `Category "${category.name}" is type ${category.type}. An EXPENSE category is required.` }, { status: 400 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const performedBy = (session.user as any)._id || '000000000000000000000000';

    try {
        const result = await FinanceTransactionService.recordExpensePayment({
            title,
            categoryId,
            amount,
            walletId,
            vendorId,
            department,
            receiptUrl,
            notes,
            date: date ? new Date(date) : undefined,
            performedBy,
        });

        await writeAuditLog({
            action: 'EXPENSE_RECORDED',
            entityType: 'ExpenseRecord',
            entityId: result.expenseId,
            performedBy: session.user.email || 'unknown',
            newState: { amount, title, walletId },
        });

        return NextResponse.json({ success: true, ...result }, { status: 201 });
    } catch (err) {
        if (err instanceof FinanceError) {
            return NextResponse.json(err.toJSON(), { status: 400 });
        }
        const msg = err instanceof Error ? err.message : 'Internal server error';
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}

// ── GET /api/finance/expenses ─────────────────────────────────────────────────

export async function GET(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await dbConnect();

    try {
        const { searchParams } = new URL(req.url);
        const query: Record<string, unknown> = {};

        const categoryId = searchParams.get('categoryId');
        const walletId = searchParams.get('walletId');
        const department = searchParams.get('department');
        const from = searchParams.get('from');
        const to = searchParams.get('to');
        const page = parseInt(searchParams.get('page') || '1', 10);
        const limit = parseInt(searchParams.get('limit') || '50', 10);

        if (categoryId && mongoose.isValidObjectId(categoryId)) query.categoryId = categoryId;
        if (walletId && mongoose.isValidObjectId(walletId)) query.walletId = walletId;
        if (department) query.department = department;

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
                .populate('vendorId', 'name')
                .sort({ date: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .lean(),
            ExpenseRecord.countDocuments(query),
        ]);

        // Summary totals
        const totalResult = await ExpenseRecord.aggregate([
            { $match: query },
            { $group: { _id: null, total: { $sum: '$amount' } } },
        ]);

        const walletsInfo = await Wallet.find({ isActive: true }).select('name type currentBalance').lean();

        return NextResponse.json({
            expenses,
            total,
            page,
            limit,
            totalAmount: totalResult[0]?.total ?? 0,
            wallets: walletsInfo,
        });
    } catch (err) {
        const msg = err instanceof Error ? err.message : 'Internal server error';
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
