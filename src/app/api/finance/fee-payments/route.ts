import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import mongoose from 'mongoose';
import dbConnect from '@/lib/mongodb';
import FeePayment from '@/models/finance/FeePayment';
import FeeInvoice from '@/models/finance/FeeInvoice';
import JournalEntry from '@/models/finance/JournalEntry';
import ChartOfAccount from '@/models/finance/ChartOfAccount';
import { generateReceiptNumber, generateJENumber, validatePeriodNotLocked, writeAuditLog } from '@/lib/finance-utils';

// GET /api/finance/fee-payments
export async function GET(req: Request) {
    try {
        await dbConnect();
        const { searchParams } = new URL(req.url);
        const invoiceId = searchParams.get('invoiceId');
        const query: Record<string, unknown> = {};
        if (invoiceId) query.feeInvoice = invoiceId;

        const payments = await FeePayment.find(query)
            .populate('feeInvoice', 'invoiceNumber studentName rollNumber totalAmount')
            .sort({ paymentDate: -1 })
            .lean();

        return NextResponse.json(payments);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// POST /api/finance/fee-payments
export async function POST(req: Request) {
    try {
        const session = await getServerSession();
        if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        await dbConnect();
        const body = await req.json();
        const {
            feeInvoiceId, amount, paymentMode, paymentDate,
            chequeNumber, bankName, transactionReference, notes,
            cashAccountCode, receivableAccountCode,
        } = body;

        if (!feeInvoiceId || !amount || !paymentMode || !paymentDate) {
            return NextResponse.json({ error: 'feeInvoiceId, amount, paymentMode, paymentDate are required.' }, { status: 400 });
        }

        const invoice = await FeeInvoice.findById(feeInvoiceId);
        if (!invoice) return NextResponse.json({ error: 'Invoice not found.' }, { status: 404 });
        if (invoice.status === 'PAID') return NextResponse.json({ error: 'Invoice is already fully paid.' }, { status: 400 });
        if (invoice.status === 'CANCELLED') return NextResponse.json({ error: 'Cannot pay a cancelled invoice.' }, { status: 400 });

        // Period lock check
        const periodCheck = await validatePeriodNotLocked(new Date(paymentDate));
        if (periodCheck.locked) return NextResponse.json({ error: periodCheck.message }, { status: 400 });

        // Use atomic session for consistency
        const dbSession = await mongoose.startSession();
        dbSession.startTransaction();

        try {
            const receiptNumber = await generateReceiptNumber();
            const jeNumber = await generateJENumber();
            const cashCode = cashAccountCode || '1001';
            const receivableCode = receivableAccountCode || '1100';

            // Find accounts
            const [cashAcct, receivableAcct] = await Promise.all([
                ChartOfAccount.findOne({ accountCode: cashCode }).lean(),
                ChartOfAccount.findOne({ accountCode: receivableCode }).lean(),
            ]);

            // Build journal entry: DR Cash / CR Student Receivable
            const jeLines = [
                {
                    account: cashAcct?._id || null,
                    accountCode: cashCode,
                    accountName: cashAcct?.accountName || 'Cash/Bank',
                    debit: amount,
                    credit: 0,
                    narration: `Fee payment: ${invoice.invoiceNumber}`,
                },
                {
                    account: receivableAcct?._id || null,
                    accountCode: receivableCode,
                    accountName: receivableAcct?.accountName || 'Student Receivable',
                    debit: 0,
                    credit: amount,
                    narration: `Fee payment: ${invoice.invoiceNumber}`,
                },
            ];

            const je = await JournalEntry.create([{
                entryNumber: jeNumber,
                entryDate: new Date(paymentDate),
                description: `Fee payment received: ${invoice.invoiceNumber} - ${invoice.studentName}`,
                reference: `Receipt: ${receiptNumber}`,
                source: 'FEE_PAYMENT',
                status: 'POSTED',
                lines: jeLines,
                totalDebit: amount,
                totalCredit: amount,
                submittedBy: session.user.email || 'unknown',
                submittedAt: new Date(),
                postedBy: session.user.email || 'unknown',
                postedAt: new Date(),
            }], { session: dbSession });

            const payment = await FeePayment.create([{
                receiptNumber,
                feeInvoice: feeInvoiceId,
                amount,
                paymentMode,
                paymentDate: new Date(paymentDate),
                chequeNumber,
                bankName,
                transactionReference,
                receivedBy: session.user.email || 'unknown',
                journalEntry: je[0]._id,
                isReversal: false,
                notes,
            }], { session: dbSession });

            // Update invoice paid amount
            invoice.paidAmount = invoice.paidAmount + amount;
            await invoice.save({ session: dbSession });

            await dbSession.commitTransaction();

            await writeAuditLog({
                action: 'PAYMENT_RECEIVED',
                entityType: 'FeePayment',
                entityId: payment[0]._id.toString(),
                entityReference: receiptNumber,
                performedBy: session.user.email || 'unknown',
                performedByName: session.user.name || undefined,
                newState: { invoiceId: feeInvoiceId, amount, receiptNumber },
            });

            return NextResponse.json({ payment: payment[0], journalEntry: je[0] }, { status: 201 });
        } catch (err) {
            await dbSession.abortTransaction();
            throw err;
        } finally {
            dbSession.endSession();
        }
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
