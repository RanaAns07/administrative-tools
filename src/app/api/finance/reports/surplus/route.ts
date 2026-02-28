import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import Transaction from '@/models/finance/Transaction';
import { OPERATIONAL_REVENUE_TYPES, OPERATIONAL_EXPENSE_TYPES } from '@/lib/finance/transactionTypes';

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

        let dateMatch: any = { $lte: now };
        if (tf === 'year') {
            past.setFullYear(now.getFullYear() - 1);
            dateMatch.$gte = past;
        } else if (tf === 'month') {
            past.setMonth(now.getMonth() - 1);
            dateMatch.$gte = past;
        } else if (tf === 'all') {
            delete dateMatch.$gte;
        }

        const groupByFormat = tf === 'year' || tf === 'all' ? '%Y-%m' : '%Y-%m-%d';

        const statsByPeriod = await Transaction.aggregate([
            {
                $match: {
                    txType: { $in: [...OPERATIONAL_REVENUE_TYPES, ...OPERATIONAL_EXPENSE_TYPES] },
                    date: dateMatch,
                    isReversed: { $ne: true }
                }
            },
            {
                $group: {
                    _id: { $dateToString: { format: groupByFormat, date: '$date' } },
                    revenue: {
                        $sum: {
                            $cond: [{ $in: ['$txType', OPERATIONAL_REVENUE_TYPES] }, '$amount', 0]
                        }
                    },
                    expense: {
                        $sum: {
                            $cond: [{ $in: ['$txType', OPERATIONAL_EXPENSE_TYPES] }, '$amount', 0]
                        }
                    }
                }
            },
            {
                $project: {
                    _id: 1,
                    revenue: 1,
                    expense: 1,
                    surplus: { $subtract: ['$revenue', '$expense'] }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        const totalRevenue = statsByPeriod.reduce((acc, curr) => acc + curr.revenue, 0);
        const totalExpense = statsByPeriod.reduce((acc, curr) => acc + curr.expense, 0);
        const netSurplus = totalRevenue - totalExpense;

        return NextResponse.json({
            statsByPeriod,
            totalRevenue,
            totalExpense,
            netSurplus,
            timeframe: tf
        }, { status: 200 });

    } catch (err: any) {
        return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
    }
}
