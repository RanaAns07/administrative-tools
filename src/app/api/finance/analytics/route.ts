/**
 * @file /api/finance/analytics/route.ts
 * @description Finance Executive Dashboard Analytics
 *
 * SURPLUS / DEFICIT FORMULA (STRICT):
 *   Operational Revenue  = Σ txType = 'FEE_PAYMENT'
 *   Operational Expenses = Σ txType IN ['PAYROLL_PAYMENT', 'EXPENSE_PAYMENT']
 *   Net Operational Surplus = Revenue – Expenses
 *
 * EXCLUDED FROM SURPLUS:
 *   SECURITY_DEPOSIT    → liability received, not income
 *   REFUND              → adjustment
 *   INVESTMENT_OUTFLOW  → capital movement
 *   INVESTMENT_RETURN   → capital movement
 *   WALLET_TRANSFER_*   → internal only, net zero
 *
 * This route runs all aggregations in parallel for performance.
 */

export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Wallet from '@/models/finance/Wallet';
import Transaction from '@/models/finance/Transaction';
import FeeInvoice from '@/models/finance/FeeInvoice';
import { OPERATIONAL_REVENUE_TYPES, OPERATIONAL_EXPENSE_TYPES } from '@/lib/finance/transactionTypes';

export async function GET() {
    try {
        await dbConnect();

        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

        const [
            walletAgg,
            revenueAgg,
            expensesAgg,
            payrollAgg,
            allOutflowByCategory,
            recentTxns,
            feeAgingAgg,
            investmentAgg,
        ] = await Promise.all([

            // 1. Cash & bank positions
            Wallet.aggregate([
                { $match: { isActive: true } },
                {
                    $group: {
                        _id: '$type',
                        total: { $sum: '$currentBalance' },
                        wallets: {
                            $push: {
                                _id: '$_id',
                                name: '$name',
                                balance: '$currentBalance',
                                currency: '$currency',
                            },
                        },
                    },
                },
                { $sort: { _id: 1 } },
            ]),

            // 2. Operational Revenue: FEE_PAYMENT only
            Transaction.aggregate([
                {
                    $match: {
                        txType: { $in: OPERATIONAL_REVENUE_TYPES as unknown as string[] },
                        date: { $gte: monthStart, $lte: monthEnd },
                    },
                },
                {
                    $group: {
                        _id: null,
                        total: { $sum: '$amount' },
                        count: { $sum: 1 },
                    },
                },
            ]),

            // 3. Operational Expenses: EXPENSE_PAYMENT
            Transaction.aggregate([
                {
                    $match: {
                        txType: 'EXPENSE_PAYMENT',
                        date: { $gte: monthStart, $lte: monthEnd },
                    },
                },
                {
                    $group: {
                        _id: null,
                        total: { $sum: '$amount' },
                        count: { $sum: 1 },
                    },
                },
            ]),

            // 4. Payroll Expenses: PAYROLL_PAYMENT
            Transaction.aggregate([
                {
                    $match: {
                        txType: 'PAYROLL_PAYMENT',
                        date: { $gte: monthStart, $lte: monthEnd },
                    },
                },
                {
                    $group: {
                        _id: null,
                        total: { $sum: '$amount' },
                        count: { $sum: 1 },
                    },
                },
            ]),

            // 5. Expense outflow grouped by expense category (for donut chart)
            Transaction.aggregate([
                {
                    $match: {
                        txType: { $in: OPERATIONAL_EXPENSE_TYPES as unknown as string[] },
                        date: { $gte: monthStart, $lte: monthEnd },
                    },
                },
                {
                    $group: {
                        _id: '$txType',
                        total: { $sum: '$amount' },
                        count: { $sum: 1 },
                    },
                },
                { $sort: { total: -1 } },
            ]),

            // 6. Recent 10 transactions (any type)
            Transaction.aggregate([
                { $sort: { date: -1 } },
                { $limit: 10 },
                {
                    $lookup: {
                        from: 'finance_wallets',
                        localField: 'walletId',
                        foreignField: '_id',
                        as: 'wallet',
                    },
                },
                {
                    $project: {
                        amount: 1,
                        txType: 1,
                        date: 1,
                        notes: 1,
                        referenceModel: 1,
                        referenceId: 1,
                        walletName: { $ifNull: [{ $arrayElemAt: ['$wallet.name', 0] }, 'Unknown'] },
                    },
                },
            ]),

            // 7. Fee aging buckets
            FeeInvoice.aggregate([
                { $match: { status: { $in: ['PENDING', 'PARTIAL', 'OVERDUE'] } } },
                {
                    $addFields: {
                        arrears: {
                            $max: [
                                0,
                                {
                                    $subtract: [
                                        {
                                            $add: [
                                                { $subtract: ['$totalAmount', '$discountAmount'] },
                                                { $subtract: ['$penaltyAmount', '$discountFromAdvance'] },
                                            ],
                                        },
                                        '$amountPaid',
                                    ],
                                },
                            ],
                        },
                        daysOverdue: {
                            $divide: [{ $subtract: [now, '$dueDate'] }, 1000 * 60 * 60 * 24],
                        },
                    },
                },
                {
                    $group: {
                        _id: {
                            $switch: {
                                branches: [
                                    { case: { $lte: ['$daysOverdue', 0] }, then: 'Current' },
                                    { case: { $lte: ['$daysOverdue', 30] }, then: '1–30 days' },
                                    { case: { $lte: ['$daysOverdue', 60] }, then: '31–60 days' },
                                    { case: { $lte: ['$daysOverdue', 90] }, then: '61–90 days' },
                                ],
                                default: '90+ days',
                            },
                        },
                        totalArrears: { $sum: '$arrears' },
                        count: { $sum: 1 },
                    },
                },
                { $sort: { _id: 1 } },
            ]),

            // 8. Total outstanding dues
            FeeInvoice.aggregate([
                { $match: { status: { $in: ['PENDING', 'PARTIAL', 'OVERDUE'] } } },
                {
                    $group: {
                        _id: null,
                        totalDues: {
                            $sum: {
                                $max: [
                                    0,
                                    {
                                        $subtract: [
                                            { $add: [{ $subtract: ['$totalAmount', '$discountAmount'] }, '$penaltyAmount'] },
                                            { $add: ['$amountPaid', '$discountFromAdvance'] },
                                        ],
                                    },
                                ],
                            },
                        },
                        count: { $sum: 1 },
                    },
                },
            ]),
        ]);

        // ── Assemble Summary ──────────────────────────────────────────────────

        const totalLiquidAssets = walletAgg.reduce(
            (s: number, b: { total: number }) => s + b.total, 0
        );

        const monthlyRevenue = revenueAgg[0]?.total || 0;
        const monthlyExpensePayments = expensesAgg[0]?.total || 0;
        const monthlyPayroll = payrollAgg[0]?.total || 0;
        const totalOperationalExpenses = monthlyExpensePayments + monthlyPayroll;
        const netOperationalSurplus = monthlyRevenue - totalOperationalExpenses;

        // Fetch Student Advances
        const { default: StudentAdvanceBalance } = await import('@/models/finance/StudentAdvanceBalance');
        const advanceAgg = await StudentAdvanceBalance.aggregate([
            { $group: { _id: null, total: { $sum: '$balance' } } }
        ]);
        const totalAdvancesOut = advanceAgg[0]?.total || 0;

        return NextResponse.json({
            cashPosition: {
                totalLiquidAssets,
                byType: walletAgg,
            },
            monthlyInflow: {
                total: monthlyRevenue,
                transactionCount: revenueAgg[0]?.count || 0,
            },
            monthlyOutflow: {
                total: totalOperationalExpenses,
                transactionCount: (expensesAgg[0]?.count || 0) + (payrollAgg[0]?.count || 0),
            },
            netCashFlow: netOperationalSurplus,
            outflowByCategory: allOutflowByCategory.map((c: any) => ({
                _id: c._id,
                categoryName: c._id.replace(/_/g, ' '),
                total: c.total,
                count: c.count
            })),
            recentTransactions: recentTxns,
            feeAging: feeAgingAgg,
            accountsReceivable: {
                total: investmentAgg[0]?.totalDues || 0,
                count: investmentAgg[0]?.count || 0,
            },
            advancesOut: {
                total: totalAdvancesOut
            },
            period: {
                month: now.toLocaleString('en-US', { month: 'long' }),
                year: now.getFullYear(),
            },
            generatedAt: now.toISOString(),
        });
    } catch (err) {
        const msg = err instanceof Error ? err.message : 'Internal server error';
        console.error('Analytics Error:', err);
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
