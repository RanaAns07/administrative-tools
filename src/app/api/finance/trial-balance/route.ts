import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import JournalEntry from '@/models/finance/JournalEntry';
import ChartOfAccount from '@/models/finance/ChartOfAccount';

// GET /api/finance/trial-balance
// Query: ?fiscalYear=<id>&from=<date>&to=<date>
export async function GET(req: Request) {
    try {
        await dbConnect();
        const { searchParams } = new URL(req.url);
        const from = searchParams.get('from');
        const to = searchParams.get('to');
        const fyId = searchParams.get('fiscalYear');

        const matchFilter: Record<string, unknown> = { status: 'POSTED' };
        if (fyId) matchFilter.fiscalYear = fyId;
        if (from || to) {
            matchFilter.entryDate = {};
            if (from) (matchFilter.entryDate as any).$gte = new Date(from);
            if (to) (matchFilter.entryDate as any).$lte = new Date(to);
        }

        // Aggregate posted JE lines by account
        const lines = await JournalEntry.aggregate([
            { $match: matchFilter },
            { $unwind: '$lines' },
            {
                $group: {
                    _id: '$lines.account',
                    accountCode: { $first: '$lines.accountCode' },
                    accountName: { $first: '$lines.accountName' },
                    totalDebit: { $sum: '$lines.debit' },
                    totalCredit: { $sum: '$lines.credit' },
                }
            },
            { $sort: { accountCode: 1 } }
        ]);

        // Fetch account metadata for type/normalBalance
        const accountIds = lines.map((l) => l._id);
        const accounts = await ChartOfAccount.find({ _id: { $in: accountIds } })
            .select('accountType normalBalance accountCode')
            .lean();
        const acctMap = new Map(accounts.map((a: any) => [a._id.toString(), a]));

        let grandTotalDebit = 0;
        let grandTotalCredit = 0;

        const trialBalance = lines.map((l) => {
            const meta = acctMap.get(l._id.toString());
            const netDebit = parseFloat((l.totalDebit - l.totalCredit).toFixed(2));
            const debitBalance = netDebit > 0 ? netDebit : 0;
            const creditBalance = netDebit < 0 ? Math.abs(netDebit) : 0;

            grandTotalDebit += debitBalance;
            grandTotalCredit += creditBalance;

            return {
                accountId: l._id,
                accountCode: l.accountCode,
                accountName: l.accountName,
                accountType: meta?.accountType || 'UNKNOWN',
                totalDebit: parseFloat(l.totalDebit.toFixed(2)),
                totalCredit: parseFloat(l.totalCredit.toFixed(2)),
                debitBalance: parseFloat(debitBalance.toFixed(2)),
                creditBalance: parseFloat(creditBalance.toFixed(2)),
            };
        });

        const isBalanced = parseFloat(grandTotalDebit.toFixed(2)) === parseFloat(grandTotalCredit.toFixed(2));

        return NextResponse.json({
            trialBalance,
            grandTotalDebit: parseFloat(grandTotalDebit.toFixed(2)),
            grandTotalCredit: parseFloat(grandTotalCredit.toFixed(2)),
            isBalanced,
            generatedAt: new Date().toISOString(),
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
