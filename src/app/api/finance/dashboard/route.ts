export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import FeeInvoice from '@/models/finance/FeeInvoice';
import VendorInvoice from '@/models/finance/VendorInvoice';
import JournalEntry from '@/models/finance/JournalEntry';
import Employee from '@/models/finance/Employee';

// GET /api/finance/dashboard — Real-time summary for the Finance dashboard
export async function GET() {
    try {
        await dbConnect();

        const now = new Date();

        const [
            totalOutstandingFees,
            overdueCount,
            totalPaymentsThisMonth,
            pendingJournalEntries,
            vendorPayablesOutstanding,
            activeEmployeeCount,
        ] = await Promise.all([
            // Total outstanding student fees
            FeeInvoice.aggregate([
                { $match: { status: { $in: ['UNPAID', 'PARTIAL', 'OVERDUE'] } } },
                { $group: { _id: null, total: { $sum: '$outstandingAmount' } } },
            ]),

            // Overdue invoice count
            FeeInvoice.countDocuments({ status: 'OVERDUE' }),

            // Payments received this month
            JournalEntry.aggregate([
                {
                    $match: {
                        status: 'POSTED',
                        source: 'FEE_PAYMENT',
                        entryDate: {
                            $gte: new Date(now.getFullYear(), now.getMonth(), 1),
                            $lte: now,
                        },
                    }
                },
                { $group: { _id: null, total: { $sum: '$totalDebit' } } },
            ]),

            // Journal entries pending approval
            JournalEntry.countDocuments({ status: 'PENDING_APPROVAL' }),

            // Vendor payables outstanding
            VendorInvoice.aggregate([
                { $match: { status: { $in: ['APPROVED', 'PARTIALLY_PAID'] } } },
                { $group: { _id: null, total: { $sum: '$outstandingAmount' } } },
            ]),

            // Active employees
            Employee.countDocuments({ status: 'ACTIVE' }),
        ]);

        // Recent journal entries
        const recentJournalEntries = await JournalEntry.find({ status: 'POSTED' })
            .sort({ postedAt: -1 })
            .limit(5)
            .select('entryNumber entryDate description totalDebit source postedAt')
            .lean();

        // Aging buckets for student fees
        const agingBuckets = await FeeInvoice.aggregate([
            { $match: { status: { $in: ['UNPAID', 'PARTIAL', 'OVERDUE'] } } },
            {
                $addFields: {
                    daysOverdue: {
                        $divide: [{ $subtract: [now, '$dueDate'] }, 1000 * 60 * 60 * 24]
                    }
                }
            },
            {
                $group: {
                    _id: {
                        $switch: {
                            branches: [
                                { case: { $lte: ['$daysOverdue', 0] }, then: 'Current' },
                                { case: { $lte: ['$daysOverdue', 30] }, then: '1-30 days' },
                                { case: { $lte: ['$daysOverdue', 60] }, then: '31-60 days' },
                                { case: { $lte: ['$daysOverdue', 90] }, then: '61-90 days' },
                            ],
                            default: '90+ days',
                        }
                    },
                    amount: { $sum: '$outstandingAmount' },
                    count: { $sum: 1 },
                }
            }
        ]);

        return NextResponse.json({
            kpis: {
                totalOutstandingFees: totalOutstandingFees[0]?.total || 0,
                overdueInvoicesCount: overdueCount,
                paymentsThisMonth: totalPaymentsThisMonth[0]?.total || 0,
                pendingJEApprovals: pendingJournalEntries,
                vendorPayablesOutstanding: vendorPayablesOutstanding[0]?.total || 0,
                activeEmployees: activeEmployeeCount,
            },
            recentJournalEntries,
            agingBuckets,
            generatedAt: now.toISOString(),
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
