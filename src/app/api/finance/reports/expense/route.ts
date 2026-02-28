import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import mongoose from 'mongoose';
import dbConnect from '@/lib/mongodb';
import ExpenseRecord from '@/models/finance/ExpenseRecord';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await dbConnect();

    try {
        const { searchParams } = new URL(req.url);
        const tf = searchParams.get('timeframe') || 'year'; // year | month | all

        const now = new Date();
        const past = new Date();

        let dateMatch: any = {};
        if (tf === 'year') {
            past.setFullYear(now.getFullYear() - 1);
            dateMatch = { date: { $gte: past, $lte: now } };
        } else if (tf === 'month') {
            past.setMonth(now.getMonth() - 1);
            dateMatch = { date: { $gte: past, $lte: now } };
        } else if (tf === 'all') {
            // No date filter for 'all' time
            dateMatch = {};
        }

        const statsByCategory = await ExpenseRecord.aggregate([
            { $match: dateMatch },
            {
                $lookup: {
                    from: 'finance_categories',
                    localField: 'categoryId',
                    foreignField: '_id',
                    as: 'category'
                }
            },
            { $unwind: '$category' },
            {
                $group: {
                    _id: '$category._id',
                    categoryName: { $first: '$category.name' },
                    totalAmount: { $sum: '$amount' },
                    count: { $sum: 1 }
                }
            },
            { $sort: { totalAmount: -1 } }
        ]);

        const totalExpense = statsByCategory.reduce((acc, curr) => acc + curr.totalAmount, 0);

        return NextResponse.json({
            statsByCategory,
            totalExpense,
            timeframe: tf
        }, { status: 200 });

    } catch (err: any) {
        return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
    }
}
