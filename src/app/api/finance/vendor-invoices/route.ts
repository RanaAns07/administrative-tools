export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import dbConnect from '@/lib/mongodb';
import VendorInvoice from '@/models/finance/VendorInvoice';
import { generateVendorInvoiceRef, writeAuditLog } from '@/lib/finance-utils';

/**
 * GET /api/finance/vendor-invoices
 * List vendor invoices with optional status/vendor filters.
 */
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

/**
 * POST /api/finance/vendor-invoices
 * Create a new vendor invoice.
 *
 * NOTE (2026-02-27 — Khatta Migration):
 *   Journal Entry auto-creation has been removed. Payment recording is now done
 *   via a Transaction (type: 'OUT') linked to this invoice via referenceType: 'VENDOR_BILL'.
 */
export async function POST(req: Request) {
    try {
        const session = await getServerSession();
        if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        await dbConnect();
        const body = await req.json();
        const {
            vendorId, purchaseOrderId, vendorInvoiceNumber, invoiceDate, dueDate,
            description, subtotal, taxAmount,
        } = body;

        if (!vendorId || !vendorInvoiceNumber || !invoiceDate || !dueDate || !subtotal) {
            return NextResponse.json(
                { error: 'vendorId, vendorInvoiceNumber, invoiceDate, dueDate, and subtotal are required.' },
                { status: 400 }
            );
        }

        const totalAmount = subtotal + (taxAmount || 0);
        const internalRef = await generateVendorInvoiceRef();

        const invoice = await VendorInvoice.create({
            vendorInvoiceNumber,
            internalReference: internalRef,
            vendor: vendorId,
            purchaseOrder: purchaseOrderId || undefined,
            invoiceDate: new Date(invoiceDate),
            dueDate: new Date(dueDate),
            subtotal,
            taxAmount: taxAmount || 0,
            totalAmount,
            paidAmount: 0,
            status: 'APPROVED',
            description,
            approvedBy: session.user.email || 'unknown',
            approvedAt: new Date(),
            createdBy: session.user.email || 'unknown',
        });

        await writeAuditLog({
            action: 'CREATE',
            entityType: 'VendorInvoice',
            entityId: invoice._id.toString(),
            entityReference: internalRef,
            performedBy: session.user.email || 'unknown',
            newState: { vendorInvoiceNumber, totalAmount },
        });

        return NextResponse.json({ invoice }, { status: 201 });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
