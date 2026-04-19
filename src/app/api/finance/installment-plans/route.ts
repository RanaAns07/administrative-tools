/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import dbConnect from '@/lib/mongodb';
import InstallmentPlan from '@/models/finance/InstallmentPlan';
import FeeInvoice from '@/models/finance/FeeInvoice';
import { withErrorHandler } from '@/lib/api-utils';
import { writeAuditLog } from '@/lib/finance-utils';

/**
 * POST /api/finance/installment-plans
 * Creates a new installment plan for a fee invoice.
 */
export const POST = withErrorHandler(async (req: Request) => {
    const session = await getServerSession();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await dbConnect();
    const body = await req.json();
    const { feeInvoice, studentId, installments } = body;

    console.log('DEBUG: Creating installment plan', { feeInvoice, studentId, installmentsCount: installments?.length });

    if (!feeInvoice || !studentId || !installments || installments.length < 2) {
        return NextResponse.json(
            { error: 'Fee Invoice, Student ID, and at least 2 installments are required.' },
            { status: 400 }
        );
    }

    const invoice = await FeeInvoice.findById(feeInvoice);
    if (!invoice) {
        return NextResponse.json({ error: 'Invoice not found.' }, { status: 404 });
    }

    // Calculate total from installments
    const totalAmount = installments.reduce((sum: number, inst: any) => sum + (Number(inst.amount) || 0), 0);
    
    // Strict validation: Total must match invoice total (within rounding margin)
    // Actually we should compare with invoice.totalAmount - discount + penalty
    const payableAmount = invoice.totalAmount - (invoice.discountAmount || 0) - (invoice.discountFromAdvance || 0) + (invoice.penaltyAmount || 0);
    
    if (Math.abs(totalAmount - payableAmount) > 0.01) {
        return NextResponse.json(
            { error: `Sum of installments (Rs ${totalAmount}) must match invoice payable amount (Rs ${payableAmount}).` },
            { status: 400 }
        );
    }

    // Create the plan
    const plan = await InstallmentPlan.create({
        feeInvoice,
        studentId,
        totalAmount: payableAmount,
        numberOfInstallments: installments.length,
        installments: installments.map((inst: any) => ({
            ...inst,
            paidAmount: 0,
            isPaid: false
        })),
        isCompleted: false,
        createdBy: session.user.email || 'unknown',
    });

    // Update invoice to link the plan (if needed) or mark it as on installment plan
    // In our schema, FeeInvoice doesn't have a direct ref to InstallmentPlan, 
    // but we can track it in notes or just rely on the separate collection.
    // However, we should mark the invoice as having installments if such a field exists.
    // Based on FeeInvoice.ts, we have installmentNumber but not installmentPlanId.
    
    invoice.notes = (invoice.notes ? invoice.notes + "\n" : "") + `Installment plan generated: ${plan._id}`;
    invoice.status = 'PARTIAL'; // Mark as partial since it's now broken down
    await invoice.save();

    await writeAuditLog({
        action: 'CREATE',
        entityType: 'InstallmentPlan',
        entityId: plan._id.toString(),
        performedBy: session.user.email || 'unknown',
        performedByName: session.user.name || undefined,
        newState: { feeInvoice, studentId, numberOfInstallments: installments.length, totalAmount: payableAmount },
    });

    return NextResponse.json({ success: true, plan });
});
