/**
 * @file route.ts
 * @description Executive Analytics API — Khatta Engine Summary
 * @route GET /api/finance/analytics
 *
 * Powers the Chancellor's financial dashboard with real-time aggregations
 * across Wallets and Transactions. All pipelines run in parallel.
 *
 * Returned shape:
 *   cashPosition   — total liquid assets by wallet type
 *   monthlyInflow  — total IN transactions this calendar month
 *   monthlyOutflow — total OUT transactions this calendar month
 *   netCashFlow    — inflow - outflow
 *   outflowByCategory — top expense categories for the month
 *   recentTransactions — last 10 transactions with wallet + category populated
 *   feeAging       — unpaid student invoice aging buckets
 *   generatedAt    — ISO timestamp
 */

export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Wallet from '@/models/finance/Wallet';
import Transaction from '@/models/finance/Transaction';
import FeeInvoice from '@/models/finance/FeeInvoice';

export async function GET() {
    try {
        await dbConnect();

        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

        // ── Run all aggregations concurrently ─────────────────────────────────
        const [
            walletAgg,
            inflowAgg,
            outflowAgg,
            outflowByCategoryAgg,
            recentTxns,
            feeAgingAgg,
        ] = await Promise.all([

            // 1. Cash position: group active wallets by type
            Wallet.aggregate([
                { $match: { isActive: true } },
                {
                    $group: {
                        _id: '$type',
                        total: { $sum: '$currentBalance' },
                        wallets: {
                            $push: {
                                name: '$name',
                                balance: '$currentBalance',
                                currency: '$currency',
                            },
                        },
                    },
                },
                { $sort: { _id: 1 } },
            ]),

            // 2. Monthly inflow
            Transaction.aggregate([
                {
                    $match: {
                        type: 'IN',
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

            // 3. Monthly outflow
            Transaction.aggregate([
                {
                    $match: {
                        type: 'OUT',
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

            // 4. Monthly outflow broken down by expense category
            Transaction.aggregate([
                {
                    $match: {
                        type: 'OUT',
                        categoryId: { $exists: true, $ne: null },
                        date: { $gte: monthStart, $lte: monthEnd },
                    },
                },
                {
                    $group: {
                        _id: '$categoryId',
                        total: { $sum: '$amount' },
                        count: { $sum: 1 },
                    },
                },
                {
                    $lookup: {
                        from: 'categories',
                        localField: '_id',
                        foreignField: '_id',
                        as: 'category',
                    },
                },
                { $unwind: { path: '$category', preserveNullAndEmptyArrays: true } },
                {
                    $project: {
                        categoryName: { $ifNull: ['$category.name', 'Uncategorised'] },
                        total: 1,
                        count: 1,
                    },
                },
                { $sort: { total: -1 } },
                { $limit: 8 },
            ]),

            // 5. Recent 10 transactions
            Transaction.aggregate([
                { $sort: { date: -1 } },
                { $limit: 10 },
                {
                    $lookup: {
                        from: 'wallets',
                        localField: 'walletId',
                        foreignField: '_id',
                        as: 'wallet',
                    },
                },
                {
                    $lookup: {
                        from: 'categories',
                        localField: 'categoryId',
                        foreignField: '_id',
                        as: 'category',
                    },
                },
                {
                    $project: {
                        amount: 1,
                        type: 1,
                        date: 1,
                        notes: 1,
                        referenceType: 1,
                        walletName: { $ifNull: [{ $arrayElemAt: ['$wallet.name', 0] }, 'Unknown'] },
                        categoryName: { $ifNull: [{ $arrayElemAt: ['$category.name', 0] }, null] },
                    },
                },
            ]),

            // 6. Fee aging buckets (using FeeInvoice V2 collection)
            FeeInvoice.aggregate([
                { $match: { status: { $in: ['PENDING', 'PARTIAL', 'OVERDUE'] } } },
                {
                    $addFields: {
                        daysOverdue: {
                            $divide: [
                                { $subtract: [now, '$dueDate'] },
                                1000 * 60 * 60 * 24,
                            ],
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
                        amount: { $sum: { $subtract: ['$totalAmount', '$amountPaid'] } },
                        count: { $sum: 1 },
                    },
                },
                { $sort: { _id: 1 } },
            ]),
        ]);

        // ── Assemble response ─────────────────────────────────────────────────
        const totalLiquidAssets = walletAgg.reduce((s: number, b: any) => s + b.total, 0);
        const monthlyInflow = inflowAgg[0]?.total || 0;
        const monthlyOutflow = outflowAgg[0]?.total || 0;
        const netCashFlow = monthlyInflow - monthlyOutflow;

        return NextResponse.json({
            cashPosition: {
                totalLiquidAssets,
                byType: walletAgg,
            },
            monthlyInflow: {
                total: monthlyInflow,
                transactionCount: inflowAgg[0]?.count || 0,
            },
            monthlyOutflow: {
                total: monthlyOutflow,
                transactionCount: outflowAgg[0]?.count || 0,
            },
            netCashFlow,
            outflowByCategory: outflowByCategoryAgg,
            recentTransactions: recentTxns,
            feeAging: feeAgingAgg,
            period: {
                month: now.toLocaleString('en-US', { month: 'long' }),
                year: now.getFullYear(),
                from: monthStart.toISOString(),
                to: monthEnd.toISOString(),
            },
            generatedAt: now.toISOString(),
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
