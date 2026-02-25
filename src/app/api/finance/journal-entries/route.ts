import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import dbConnect from '@/lib/mongodb';
import JournalEntry from '@/models/finance/JournalEntry';
import ChartOfAccount from '@/models/finance/ChartOfAccount';
import AccountingPeriod from '@/models/finance/AccountingPeriod';
import FiscalYear from '@/models/finance/FiscalYear';
import {
    validateDoubleEntry,
    validatePeriodNotLocked,
    generateJENumber,
    writeAuditLog,
} from '@/lib/finance-utils';

// GET /api/finance/journal-entries
export async function GET(req: Request) {
    try {
        await dbConnect();
        const { searchParams } = new URL(req.url);
        const status = searchParams.get('status');
        const source = searchParams.get('source');
        const from = searchParams.get('from');
        const to = searchParams.get('to');
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '50');

        const query: Record<string, unknown> = {};
        if (status) query.status = status;
        if (source) query.source = source;
        if (from || to) {
            query.entryDate = {};
            if (from) (query.entryDate as any).$gte = new Date(from);
            if (to) (query.entryDate as any).$lte = new Date(to);
        }

        const [entries, total] = await Promise.all([
            JournalEntry.find(query)
                .sort({ entryDate: -1, createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .lean(),
            JournalEntry.countDocuments(query),
        ]);

        return NextResponse.json({ entries, total, page, limit });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// POST /api/finance/journal-entries
export async function POST(req: Request) {
    try {
        const session = await getServerSession();
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        await dbConnect();

        const body = await req.json();
        const { entryDate, description, reference, source = 'MANUAL', lines, attachments } = body;

        if (!entryDate || !description || !lines || lines.length < 2) {
            return NextResponse.json(
                { error: 'entryDate, description, and at least 2 lines are required.' },
                { status: 400 }
            );
        }

        // 1. Double-entry validation
        const deCheck = validateDoubleEntry(lines);
        if (!deCheck.valid) {
            return NextResponse.json({ error: deCheck.message }, { status: 400 });
        }

        // 2. Period lock check
        const periodCheck = await validatePeriodNotLocked(new Date(entryDate));
        if (periodCheck.locked) {
            return NextResponse.json({ error: periodCheck.message }, { status: 400 });
        }

        // 3. Validate all account codes exist
        for (const line of lines) {
            if (!line.account) {
                return NextResponse.json({ error: 'Each line must have an account.' }, { status: 400 });
            }
            const acct = await ChartOfAccount.findById(line.account).lean();
            if (!acct) {
                return NextResponse.json({ error: `Account not found: ${line.account}` }, { status: 400 });
            }
            if (acct.isControl) {
                return NextResponse.json(
                    { error: `Account "${acct.accountCode} - ${acct.accountName}" is a control account and cannot be posted to directly.` },
                    { status: 400 }
                );
            }
            // Enrich line with accountCode + accountName
            line.accountCode = acct.accountCode;
            line.accountName = acct.accountName;
        }

        // 4. Find fiscal year and accounting period
        const d = new Date(entryDate);
        const [fiscalYear, period] = await Promise.all([
            FiscalYear.findOne({ startDate: { $lte: d }, endDate: { $gte: d }, status: 'OPEN' }).lean(),
            AccountingPeriod.findOne({ startDate: { $lte: d }, endDate: { $gte: d } }).lean(),
        ]);

        if (fiscalYear?.status === 'CLOSED') {
            return NextResponse.json({ error: 'The fiscal year for this date is closed.' }, { status: 400 });
        }

        const entryNumber = await generateJENumber();

        const je = await JournalEntry.create({
            entryNumber,
            entryDate: d,
            description,
            reference,
            source,
            status: 'DRAFT',
            lines,
            totalDebit: deCheck.totalDebit,
            totalCredit: deCheck.totalCredit,
            accountingPeriod: period?._id,
            fiscalYear: fiscalYear?._id,
            submittedBy: session.user.email || 'unknown',
            submittedAt: new Date(),
            attachments: attachments || [],
        });

        await writeAuditLog({
            action: 'CREATE',
            entityType: 'JournalEntry',
            entityId: je._id.toString(),
            entityReference: je.entryNumber,
            performedBy: session.user.email || 'unknown',
            performedByName: session.user.name || undefined,
            newState: { status: 'DRAFT', totalDebit: deCheck.totalDebit, totalCredit: deCheck.totalCredit },
        });

        return NextResponse.json(je, { status: 201 });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
