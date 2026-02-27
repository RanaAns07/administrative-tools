/* eslint-disable @typescript-eslint/no-explicit-any */
export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import dbConnect from '@/lib/mongodb';
import PurchaseOrder from '@/models/finance/PurchaseOrder';
import { generateSequenceNumber, writeAuditLog } from '@/lib/finance-utils';

export async function GET(req: Request) {
    try {
        await dbConnect();
        const { searchParams } = new URL(req.url);
        const status = searchParams.get('status');
        const vendorId = searchParams.get('vendor');
        const query: Record<string, unknown> = {};
        if (status) query.status = status;
        if (vendorId) query.vendor = vendorId;

        const orders = await PurchaseOrder.find(query)
            .populate('vendor', 'companyName vendorCode')
            .populate('purchaseRequest', 'prNumber title')
            .sort({ createdAt: -1 })
            .lean();
        return NextResponse.json(orders);
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
        const { vendorId, purchaseRequestId, expectedDeliveryDate, items, termsAndConditions } = body;

        if (!vendorId || !items?.length) {
            return NextResponse.json({ error: 'vendorId and items are required.' }, { status: 400 });
        }

        const subtotal = items.reduce((s: number, i: any) => s + ((i.unitPrice || 0) * (i.quantity || 1)), 0);
        const gstAmount = items.reduce((s: number, i: any) => s + ((i.gstPercentage || 0) / 100 * (i.unitPrice || 0) * (i.quantity || 1)), 0);
        const totalAmount = subtotal + gstAmount;
        const poNumber = await generateSequenceNumber('PO', PurchaseOrder, 'poNumber');

        const po = await PurchaseOrder.create({
            poNumber,
            vendor: vendorId,
            purchaseRequest: purchaseRequestId || undefined,
            expectedDeliveryDate: expectedDeliveryDate ? new Date(expectedDeliveryDate) : undefined,
            items,
            subtotal,
            gstAmount,
            totalAmount,
            termsAndConditions,
            status: 'DRAFT',
            createdBy: session.user.email || 'unknown',
        });

        await writeAuditLog({
            action: 'CREATE',
            entityType: 'PurchaseOrder',
            entityId: po._id.toString(),
            entityReference: poNumber,
            performedBy: session.user.email || 'unknown',
        });

        return NextResponse.json(po, { status: 201 });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
