/* eslint-disable @typescript-eslint/no-explicit-any */
export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import FeeInvoice from '@/models/finance/FeeInvoice';
import VendorInvoice from '@/models/finance/VendorInvoice';
import Wallet from '@/models/finance/Wallet';
import Transaction from '@/models/finance/Transaction';
import Employee from '@/models/finance/Employee';

/**
 * GET /api/finance/dashboard — Real-time Khatta Engine summary
 *
 * KPIs returned:
 *   - Total wallet balances (by type: BANK, CASH, INVESTMENT)
 *   - Total outstanding student fees
 *   - Overdue invoice count
 *   - Income vs Expense this month (from Transactions)
 *   - Vendor payables outstanding
 *   - Active employee count
 */
export async function GET() {
    try {
        await dbConnect();

        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

        const [
            totalOutstandingFees,
            overdueCount,
            incomeThisMonth,
            expenseThisMonth,
            vendorPayablesOutstanding,
            activeEmployeeCount,
            wallets,
        ] = await Promise.all([
            // Total outstanding student fees
            FeeInvoice.aggregate([
                { $match: { status: { $in: ['UNPAID', 'PARTIAL', 'OVERDUE'] } } },
                { $group: { _id: null, total: { $sum: '$outstandingAmount' } } },
            ]),

            // Overdue invoice count
            FeeInvoice.countDocuments({ status: 'OVERDUE' }),

            // Money IN this month
            Transaction.aggregate([
                { $match: { type: 'IN', date: { $gte: monthStart, $lte: now } } },
                { $group: { _id: null, total: { $sum: '$amount' } } },
            ]),

            // Money OUT this month
            Transaction.aggregate([
                { $match: { type: 'OUT', date: { $gte: monthStart, $lte: now } } },
                { $group: { _id: null, total: { $sum: '$amount' } } },
            ]),

            // Vendor payables outstanding
            VendorInvoice.aggregate([
                { $match: { status: { $in: ['APPROVED', 'PARTIALLY_PAID'] } } },
                { $group: { _id: null, total: { $sum: '$outstandingAmount' } } },
            ]),

            // Active employees
            Employee.countDocuments({ status: 'ACTIVE' }),

            // All active wallets with balances
            Wallet.find({ isActive: true }).select('name type currentBalance currency').lean(),
        ]);

        // Recent transactions
        const recentTransactions = await Transaction.find()
            .sort({ date: -1 })
            .limit(5)
            .populate('categoryId', 'name type')
            .populate('walletId', 'name type')
            .select('amount type date notes referenceType')
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

        // Wallet summary grouped by type
        const walletSummary = wallets.reduce((acc: Record<string, number>, w) => {
            acc[w.type] = (acc[w.type] || 0) + w.currentBalance;
            return acc;
        }, {});

        return NextResponse.json({
            kpis: {
                totalOutstandingFees: totalOutstandingFees[0]?.total || 0,
                overdueInvoicesCount: overdueCount,
                incomeThisMonth: incomeThisMonth[0]?.total || 0,
                expenseThisMonth: expenseThisMonth[0]?.total || 0,
                netCashFlowThisMonth: (incomeThisMonth[0]?.total || 0) - (expenseThisMonth[0]?.total || 0),
                vendorPayablesOutstanding: vendorPayablesOutstanding[0]?.total || 0,
                activeEmployees: activeEmployeeCount,
            },
            wallets,
            walletSummary,
            recentTransactions,
            agingBuckets,
            generatedAt: now.toISOString(),
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
