import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import SalarySlip from '@/models/finance/SalarySlip';

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

        const statsByDepartment = await SalarySlip.aggregate([
            {
                $match: {
                    status: 'PAID',
                    updatedAt: dateMatch
                }
            },
            {
                $lookup: {
                    from: 'university_staff', // ensure collection name matches
                    localField: 'staffId',
                    foreignField: '_id',
                    as: 'staff'
                }
            },
            { $unwind: '$staff' },
            {
                $group: {
                    _id: '$staff.department',
                    totalAmount: { $sum: '$netPayable' },
                    count: { $sum: 1 }
                }
            },
            { $sort: { totalAmount: -1 } }
        ]);

        const totalSalary = statsByDepartment.reduce((acc, curr) => acc + curr.totalAmount, 0);

        return NextResponse.json({
            statsByDepartment: statsByDepartment.map(d => ({
                department: d._id || 'Unassigned',
                totalAmount: d.totalAmount,
                count: d.count
            })),
            totalSalary,
            timeframe: tf
        }, { status: 200 });

    } catch (err: any) {
        return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
    }
}
