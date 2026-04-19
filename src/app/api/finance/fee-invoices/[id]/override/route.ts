/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import dbConnect from '@/lib/mongodb';
import FeeInvoice from '@/models/finance/FeeInvoice';
import { withErrorHandler } from '@/lib/api-utils';
import { writeAuditLog } from '@/lib/finance-utils';

/**
 * PUT /api/finance/fee-invoices/[id]/override
 * Overrides the fee structure for a specific student's invoice.
 */
export const PUT = withErrorHandler(async (req: Request, { params }: { params: { id: string } }) => {
    const session = await getServerSession();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await dbConnect();
    const { id } = params;
    const body = await req.json();
    const { isCustomFee, customFeeHeads, totalAmount } = body;

    console.log(`DEBUG: Overriding fee for invoice ${id}`, { isCustomFee, customFeeHeads, totalAmount });

    const invoice = await FeeInvoice.findById(id);
    if (!invoice) {
        return NextResponse.json({ error: 'Invoice not found.' }, { status: 404 });
    }

    if (invoice.status === 'PAID') {
        return NextResponse.json({ error: 'Cannot override a fully paid invoice.' }, { status: 400 });
    }

    const oldState = JSON.parse(JSON.stringify(invoice));

    // Update fields
    invoice.isCustomFee = isCustomFee;
    invoice.customFeeHeads = customFeeHeads;
    invoice.totalAmount = totalAmount;
    
    // If it's a custom fee, we should probably recalculate the status if any payments were already made
    // but typically overrides happen on PENDING invoices.
    
    await invoice.save();

    await writeAuditLog({
        action: 'UPDATE',
        entityType: 'FeeInvoice',
        entityId: id,
        performedBy: session.user.email || 'unknown',
        performedByName: session.user.name || undefined,
        oldState: { 
            isCustomFee: oldState.isCustomFee, 
            totalAmount: oldState.totalAmount, 
            customFeeHeads: oldState.customFeeHeads 
        },
        newState: { isCustomFee, totalAmount, customFeeHeads },
    });

    return NextResponse.json({ success: true, invoice });
});
