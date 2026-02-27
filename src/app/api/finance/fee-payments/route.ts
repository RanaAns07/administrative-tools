export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import dbConnect from '@/lib/mongodb';
import FeePayment from '@/models/finance/FeePayment';
import FeeInvoice from '@/models/finance/FeeInvoice';
import { generateReceiptNumber, writeAuditLog } from '@/lib/finance-utils';

/**
 * GET /api/finance/fee-payments
 * List payments with optional invoice filter.
 */
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

/**
 * POST /api/finance/fee-payments
 * Record a student fee payment and update the invoice.
 *
 * NOTE (2026-02-27 — Khatta Migration):
 *   Journal Entry auto-creation has been removed. After creating the payment
 *   record here, record the cash receipt separately via:
 *     POST /api/finance/transactions
 *     { type: 'IN', referenceType: 'FEE_INVOICE', referenceId: feeInvoiceId, ... }
 *   The Transaction pre-save hook will update the wallet balance automatically.
 */
export async function POST(req: Request) {
    try {
        const session = await getServerSession();
        if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        await dbConnect();
        const body = await req.json();
        const {
            feeInvoiceId, amount, paymentMode, paymentDate,
            chequeNumber, bankName, transactionReference, notes,
        } = body;

        if (!feeInvoiceId || !amount || !paymentMode || !paymentDate) {
            return NextResponse.json({ error: 'feeInvoiceId, amount, paymentMode, paymentDate are required.' }, { status: 400 });
        }

        const invoice = await FeeInvoice.findById(feeInvoiceId);
        if (!invoice) return NextResponse.json({ error: 'Invoice not found.' }, { status: 404 });
        if (invoice.status === 'PAID') return NextResponse.json({ error: 'Invoice is already fully paid.' }, { status: 400 });
        if (invoice.status === 'WAIVED') return NextResponse.json({ error: 'Cannot pay a waived invoice.' }, { status: 400 });

        const receiptNumber = await generateReceiptNumber();

        const payment = await FeePayment.create({
            receiptNumber,
            feeInvoice: feeInvoiceId,
            amount,
            paymentMode,
            paymentDate: new Date(paymentDate),
            chequeNumber,
            bankName,
            transactionReference,
            receivedBy: session.user.email || 'unknown',
            isReversal: false,
            notes,
        });

        // Update invoice paid amount
        invoice.amountPaid = invoice.amountPaid + amount;
        await invoice.save();

        await writeAuditLog({
            action: 'PAYMENT_RECEIVED',
            entityType: 'FeePayment',
            entityId: payment._id.toString(),
            entityReference: receiptNumber,
            performedBy: session.user.email || 'unknown',
            performedByName: session.user.name || undefined,
            newState: { invoiceId: feeInvoiceId, amount, receiptNumber },
        });

        return NextResponse.json({
            payment,
            message: `Payment recorded. Record cash receipt via POST /api/finance/transactions with type:IN, referenceType:FEE_INVOICE.`,
        }, { status: 201 });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
