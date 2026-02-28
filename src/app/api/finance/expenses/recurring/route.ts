import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import mongoose from 'mongoose';
import dbConnect from '@/lib/mongodb';
import RecurringExpense from '@/models/finance/RecurringExpense';
import Category from '@/models/finance/Category';
import Wallet from '@/models/finance/Wallet';
import { writeAuditLog } from '@/lib/finance-utils';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await dbConnect();

    try {
        const body = await req.json();
        const { title, categoryId, amount, walletId, vendorId, department, dayOfMonth } = body;

        if (!title || !categoryId || !walletId || !amount || !dayOfMonth) {
            return NextResponse.json({ error: 'title, categoryId, walletId, amount, and dayOfMonth are required.' }, { status: 400 });
        }

        if (amount <= 0) {
            return NextResponse.json({ error: 'amount must be a positive number.' }, { status: 400 });
        }

        if (dayOfMonth < 1 || dayOfMonth > 28) {
            return NextResponse.json({ error: 'dayOfMonth must be between 1 and 28.' }, { status: 400 });
        }

        // Validate category
        const category = await Category.findById(categoryId).lean();
        if (!category || category.type !== 'EXPENSE') {
            return NextResponse.json({ error: 'Valid EXPENSE category is required.' }, { status: 400 });
        }

        // Validate wallet
        const wallet = await Wallet.findById(walletId).lean();
        if (!wallet) {
            return NextResponse.json({ error: 'Valid Paying Wallet is required.' }, { status: 400 });
        }

        const newRecurring = new RecurringExpense({
            title,
            categoryId,
            amount,
            walletId,
            vendorId: vendorId || undefined,
            department: department || undefined,
            dayOfMonth,
            isActive: true
        });

        await newRecurring.save();

        await writeAuditLog({
            action: 'CREATE',
            entityType: 'RecurringExpense',
            entityId: newRecurring._id.toString(),
            performedBy: session.user.email || 'unknown',
            newState: { title, amount, dayOfMonth }
        });

        return NextResponse.json({ success: true, recurringExpense: newRecurring }, { status: 201 });
    } catch (err: any) {
        return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
    }
}

export async function GET(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await dbConnect();

    try {
        const { searchParams } = new URL(req.url);
        const isActive = searchParams.get('isActive');

        const query: any = {};
        if (isActive !== null) {
            query.isActive = isActive === 'true';
        }

        const recurringExpenses = await RecurringExpense.find(query)
            .populate('categoryId', 'name')
            .populate('walletId', 'name')
            .populate('vendorId', 'name')
            .sort({ createdAt: -1 })
            .lean();

        return NextResponse.json({ recurringExpenses }, { status: 200 });
    } catch (err: any) {
        return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
    }
}
