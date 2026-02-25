export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import JournalEntry from '@/models/finance/JournalEntry';
import ChartOfAccount from '@/models/finance/ChartOfAccount';

// GET /api/finance/reports/balance-sheet?fiscalYear=<id>&asOf=<date>
export async function GET(req: Request) {
    try {
        await dbConnect();
        const { searchParams } = new URL(req.url);
        const asOf = searchParams.get('asOf') ? new Date(searchParams.get('asOf')!) : new Date();
        const fyId = searchParams.get('fiscalYear');

        const matchFilter: Record<string, unknown> = {
            status: 'POSTED',
            entryDate: { $lte: asOf },
        };
        if (fyId) matchFilter.fiscalYear = fyId;

        // Aggregate all posted lines up to asOf date
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

        const assets: any[] = [];
        const liabilities: any[] = [];
        const equity: any[] = [];

        for (const l of lines) {
            const meta = acctMap.get(l._id.toString());
            if (!meta) continue;
            if (!['ASSET', 'LIABILITY', 'EQUITY'].includes(meta.accountType)) continue;

            const netAmount = meta.normalBalance === 'DEBIT'
                ? parseFloat((l.totalDebit - l.totalCredit).toFixed(2))
                : parseFloat((l.totalCredit - l.totalDebit).toFixed(2));

            const entry = {
                accountCode: l.accountCode,
                accountName: l.accountName,
                accountType: meta.accountType,
                accountSubType: meta.accountSubType,
                amount: netAmount,
            };

            if (meta.accountType === 'ASSET') assets.push(entry);
            else if (meta.accountType === 'LIABILITY') liabilities.push(entry);
            else equity.push(entry);
        }

        const totalAssets = assets.reduce((s, a) => s + a.amount, 0);
        const totalLiabilities = liabilities.reduce((s, a) => s + a.amount, 0);
        const totalEquity = equity.reduce((s, a) => s + a.amount, 0);
        const isBalanced = parseFloat((totalLiabilities + totalEquity).toFixed(2)) === parseFloat(totalAssets.toFixed(2));

        return NextResponse.json({
            asOf: asOf.toISOString(),
            assets: assets.sort((a, b) => a.accountCode.localeCompare(b.accountCode)),
            liabilities: liabilities.sort((a, b) => a.accountCode.localeCompare(b.accountCode)),
            equity: equity.sort((a, b) => a.accountCode.localeCompare(b.accountCode)),
            totalAssets: parseFloat(totalAssets.toFixed(2)),
            totalLiabilities: parseFloat(totalLiabilities.toFixed(2)),
            totalEquity: parseFloat(totalEquity.toFixed(2)),
            totalLiabilitiesAndEquity: parseFloat((totalLiabilities + totalEquity).toFixed(2)),
            isBalanced,
            generatedAt: new Date().toISOString(),
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
