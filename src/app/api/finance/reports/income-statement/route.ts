import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import JournalEntry from '@/models/finance/JournalEntry';
import ChartOfAccount from '@/models/finance/ChartOfAccount';

// GET /api/finance/reports/income-statement?from=<date>&to=<date>&fiscalYear=<id>
export async function GET(req: Request) {
    try {
        await dbConnect();
        const { searchParams } = new URL(req.url);
        const from = searchParams.get('from') ? new Date(searchParams.get('from')!) : undefined;
        const to = searchParams.get('to') ? new Date(searchParams.get('to')!) : new Date();
        const fyId = searchParams.get('fiscalYear');

        const matchFilter: Record<string, unknown> = { status: 'POSTED' };
        if (fyId) matchFilter.fiscalYear = fyId;
        if (from || to) {
            matchFilter.entryDate = {};
            if (from) (matchFilter.entryDate as any).$gte = from;
            if (to) (matchFilter.entryDate as any).$lte = to;
        }

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
            }
        ]);

        const accountIds = lines.map((l) => l._id);
        const accounts = await ChartOfAccount.find({ _id: { $in: accountIds } })
            .select('accountType accountSubType normalBalance')
            .lean();
        const acctMap = new Map(accounts.map((a: any) => [a._id.toString(), a]));

        const revenues: any[] = [];
        const expenses: any[] = [];

        for (const l of lines) {
            const meta = acctMap.get(l._id.toString());
            if (!meta || !['REVENUE', 'EXPENSE'].includes(meta.accountType)) continue;

            const netAmount = meta.normalBalance === 'CREDIT'
                ? parseFloat((l.totalCredit - l.totalDebit).toFixed(2))
                : parseFloat((l.totalDebit - l.totalCredit).toFixed(2));

            const entry = {
                accountCode: l.accountCode,
                accountName: l.accountName,
                accountSubType: meta.accountSubType,
                amount: netAmount,
            };

            if (meta.accountType === 'REVENUE') revenues.push(entry);
            else expenses.push(entry);
        }

        const totalRevenue = revenues.reduce((s, r) => s + r.amount, 0);
        const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
        const netIncome = totalRevenue - totalExpenses;

        return NextResponse.json({
            period: { from: from?.toISOString(), to: to.toISOString() },
            revenues: revenues.sort((a, b) => a.accountCode.localeCompare(b.accountCode)),
            expenses: expenses.sort((a, b) => a.accountCode.localeCompare(b.accountCode)),
            totalRevenue: parseFloat(totalRevenue.toFixed(2)),
            totalExpenses: parseFloat(totalExpenses.toFixed(2)),
            netIncome: parseFloat(netIncome.toFixed(2)),
            generatedAt: new Date().toISOString(),
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
