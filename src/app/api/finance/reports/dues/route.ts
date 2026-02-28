import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import FeeInvoice from '@/models/finance/FeeInvoice';
// Preload refs
import '@/models/university/Batch';
import { PipelineStage } from 'mongoose';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await dbConnect();

    try {
        const pipeline: PipelineStage[] = [
            {
                $match: {
                    status: { $in: ['PENDING', 'PARTIAL', 'OVERDUE'] }
                }
            },
            {
                $project: {
                    batchId: 1,
                    outstandingAmount: {
                        $max: [
                            0,
                            {
                                $subtract: [
                                    {
                                        $add: [
                                            { $subtract: ['$totalAmount', '$discountAmount'] },
                                            { $subtract: ['$penaltyAmount', '$discountFromAdvance'] }
                                        ]
                                    },
                                    '$amountPaid'
                                ]
                            }
                        ]
                    }
                }
            },
            {
                $group: {
                    _id: '$batchId',
                    totalOutstanding: { $sum: '$outstandingAmount' },
                    invoiceCount: { $sum: 1 }
                }
            },
            {
                $lookup: {
                    from: 'academic_batches',  // Make sure this matches Batch collection name
                    localField: '_id',
                    foreignField: '_id',
                    as: 'batch'
                }
            },
            { $unwind: { path: '$batch', preserveNullAndEmptyArrays: true } },
            { $sort: { totalOutstanding: -1 } }
        ];

        const duesByBatch = await FeeInvoice.aggregate(pipeline);

        const totalDues = duesByBatch.reduce((sum, item) => sum + item.totalOutstanding, 0);

        return NextResponse.json({
            duesByBatch: duesByBatch.map(item => ({
                batchId: item._id,
                batchName: item.batch ? `${item.batch.year} ${item.batch.season} (Program ${item.batch.programId})` : 'Unknown Batch',
                totalOutstanding: item.totalOutstanding,
                invoiceCount: item.invoiceCount
            })),
            totalDues
        }, { status: 200 });

    } catch (err: any) {
        return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
    }
}
