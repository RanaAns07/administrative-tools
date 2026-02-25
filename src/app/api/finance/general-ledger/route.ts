import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import JournalEntry from '@/models/finance/JournalEntry';

// GET /api/finance/general-ledger?accountId=<id>&from=<date>&to=<date>
export async function GET(req: Request) {
    try {
        await dbConnect();
        const { searchParams } = new URL(req.url);
        const accountId = searchParams.get('accountId');
        const accountCode = searchParams.get('accountCode');
        const from = searchParams.get('from');
        const to = searchParams.get('to');

        if (!accountId && !accountCode) {
            return NextResponse.json({ error: 'accountId or accountCode is required.' }, { status: 400 });
        }

        const matchFilter: Record<string, unknown> = { status: 'POSTED' };
        if (from || to) {
            matchFilter.entryDate = {};
            if (from) (matchFilter.entryDate as any).$gte = new Date(from);
            if (to) (matchFilter.entryDate as any).$lte = new Date(to);
        }

        // Get all posted JEs that have this account on at least one line
        const lineMatch: Record<string, unknown> = {};
        if (accountId) lineMatch['lines.account'] = accountId;
        if (accountCode) lineMatch['lines.accountCode'] = accountCode;

        const entries = await JournalEntry.aggregate([
            { $match: matchFilter },
            { $unwind: '$lines' },
            {
                $match: accountId
                    ? { 'lines.account': { $toString: accountId } }
                    : { 'lines.accountCode': accountCode },
            },
            {
                $project: {
                    entryNumber: 1,
                    entryDate: 1,
                    description: 1,
                    reference: 1,
                    source: 1,
                    accountCode: '$lines.accountCode',
                    accountName: '$lines.accountName',
                    debit: '$lines.debit',
                    credit: '$lines.credit',
                    narration: '$lines.narration',
                }
            },
            { $sort: { entryDate: 1 } },
        ]);

        // Compute running balance
        let runningBalance = 0;
        let totalDebit = 0;
        let totalCredit = 0;

        const ledgerEntries = entries.map((e: any) => {
            runningBalance += (e.debit || 0) - (e.credit || 0);
            totalDebit += e.debit || 0;
            totalCredit += e.credit || 0;

            return {
                ...e,
                runningBalance: parseFloat(runningBalance.toFixed(2)),
            };
        });

        return NextResponse.json({
            ledgerEntries,
            totalDebit: parseFloat(totalDebit.toFixed(2)),
            totalCredit: parseFloat(totalCredit.toFixed(2)),
            closingBalance: parseFloat(runningBalance.toFixed(2)),
            entryCount: entries.length,
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
