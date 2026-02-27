export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import FeePayment from '@/models/finance/FeePayment';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

/**
 * GET /api/admin/payment-approvals
 * List FeePayment records filtered by status (default: PENDING).
 *
 * NOTE: In the Khatta system, fee collection creates a Transaction (IN) directly
 * via POST /api/finance/fee-collection. The FeePayment model is a legacy
 * record-keeping layer. For new invoice payments, the fee-collection route
 * is the canonical flow. This route is retained for legacy payment record display.
 */
export async function GET(req: NextRequest) {
    try {
        await dbConnect();
        const status = req.nextUrl.searchParams.get('status') || 'PENDING';

        const payments = await FeePayment.find({ status })
            .populate({ path: 'feeInvoice', select: 'studentId studentName rollNumber totalAmount' })
            .sort({ createdAt: -1 })
            .lean();

        return NextResponse.json(payments);
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

/**
 * PATCH /api/admin/payment-approvals
 * Approve or reject a legacy FeePayment record.
 * This does NOT update FeeInvoice amountPaid — use the fee-collection route for that.
 */
export async function PATCH(req: NextRequest) {
    try {
        await dbConnect();
        const session = await getServerSession(authOptions as any);
        const body = await req.json();
        const { paymentId, action, rejectionReason } = body;

        if (!paymentId || !action) {
            return NextResponse.json({ error: 'paymentId and action are required' }, { status: 400 });
        }
        if (!['APPROVE', 'REJECT'].includes(action)) {
            return NextResponse.json({ error: 'action must be APPROVE or REJECT' }, { status: 400 });
        }

        const payment = await FeePayment.findById(paymentId);
        if (!payment) return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
        if (payment.status !== 'PENDING') {
            return NextResponse.json({ error: 'Payment is not in PENDING state' }, { status: 409 });
        }

        const performedBy = (session as any)?.user?.email || 'admin';

        if (action === 'APPROVE') {
            payment.status = 'APPROVED';
            payment.approvedBy = performedBy;
            payment.approvedAt = new Date();
        } else {
            payment.status = 'REJECTED';
            payment.rejectionReason = rejectionReason || 'Rejected by admin';
        }

        await payment.save();
        return NextResponse.json({ success: true, payment });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
