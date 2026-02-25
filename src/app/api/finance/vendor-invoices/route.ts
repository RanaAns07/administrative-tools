import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import mongoose from 'mongoose';
import dbConnect from '@/lib/mongodb';
import VendorInvoice from '@/models/finance/VendorInvoice';
import JournalEntry from '@/models/finance/JournalEntry';
import ChartOfAccount from '@/models/finance/ChartOfAccount';
import { generateVendorInvoiceRef, generateJENumber, validatePeriodNotLocked, writeAuditLog } from '@/lib/finance-utils';

export async function GET(req: Request) {
    try {
        await dbConnect();
        const { searchParams } = new URL(req.url);
        const status = searchParams.get('status');
        const vendorId = searchParams.get('vendor');
        const query: Record<string, unknown> = {};
        if (status) query.status = status;
        if (vendorId) query.vendor = vendorId;

        const invoices = await VendorInvoice.find(query)
            .populate('vendor', 'companyName vendorCode')
            .populate('purchaseOrder', 'poNumber')
            .sort({ createdAt: -1 })
            .lean();
        return NextResponse.json(invoices);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const session = await getServerSession();
        if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        await dbConnect();
        const body = await req.json();
        const {
            vendorId, purchaseOrderId, vendorInvoiceNumber, invoiceDate, dueDate,
            description, subtotal, taxAmount, expenseAccountCode, payableAccountCode,
        } = body;

        if (!vendorId || !vendorInvoiceNumber || !invoiceDate || !dueDate || !subtotal || !expenseAccountCode || !payableAccountCode) {
            return NextResponse.json({ error: 'vendorId, vendorInvoiceNumber, invoiceDate, dueDate, subtotal, expenseAccountCode, payableAccountCode are required.' }, { status: 400 });
        }

        const periodCheck = await validatePeriodNotLocked(new Date(invoiceDate));
        if (periodCheck.locked) return NextResponse.json({ error: periodCheck.message }, { status: 400 });

        const totalAmount = subtotal + (taxAmount || 0);
        const internalRef = await generateVendorInvoiceRef();
        const jeNumber = await generateJENumber();

        const dbSession = await mongoose.startSession();
        dbSession.startTransaction();
        try {
            const [expenseAcct, payableAcct] = await Promise.all([
                ChartOfAccount.findOne({ accountCode: expenseAccountCode }).lean(),
                ChartOfAccount.findOne({ accountCode: payableAccountCode }).lean(),
            ]);

            // DR Expense / CR Accounts Payable
            const je = await JournalEntry.create([{
                entryNumber: jeNumber,
                entryDate: new Date(invoiceDate),
                description: `Vendor invoice: ${vendorInvoiceNumber} — ${description || ''}`,
                source: 'MANUAL',
                status: 'POSTED',
                lines: [
                    { account: expenseAcct?._id, accountCode: expenseAccountCode, accountName: expenseAcct?.accountName || 'Expense', debit: totalAmount, credit: 0, narration: description },
                    { account: payableAcct?._id, accountCode: payableAccountCode, accountName: payableAcct?.accountName || 'Accounts Payable', debit: 0, credit: totalAmount, narration: `Payable: ${vendorInvoiceNumber}` },
                ],
                totalDebit: totalAmount, totalCredit: totalAmount,
                submittedBy: session.user!.email || 'unknown',
                postedBy: session.user!.email || 'unknown',
                postedAt: new Date(),
            }], { session: dbSession });

            const invoice = await VendorInvoice.create([{
                vendorInvoiceNumber, internalReference: internalRef,
                vendor: vendorId, purchaseOrder: purchaseOrderId || undefined,
                invoiceDate: new Date(invoiceDate), dueDate: new Date(dueDate),
                subtotal, taxAmount: taxAmount || 0, totalAmount,
                paidAmount: 0, status: 'APPROVED',
                journalEntry: je[0]._id,
                paymentJournalEntries: [],
                description, expenseAccountCode, payableAccountCode,
                approvedBy: session.user!.email || 'unknown',
                approvedAt: new Date(),
                createdBy: session.user!.email || 'unknown',
            }], { session: dbSession });

            await dbSession.commitTransaction();

            await writeAuditLog({
                action: 'CREATE',
                entityType: 'VendorInvoice',
                entityId: invoice[0]._id.toString(),
                entityReference: internalRef,
                performedBy: session.user.email || 'unknown',
                newState: { vendorInvoiceNumber, totalAmount },
            });

            return NextResponse.json({ invoice: invoice[0], journalEntry: je[0] }, { status: 201 });
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
