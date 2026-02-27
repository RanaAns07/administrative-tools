export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import dbConnect from '@/lib/mongodb';
import FeeInvoice from '@/models/finance/FeeInvoice';
import FeeStructure from '@/models/finance/FeeStructure';
import { writeAuditLog } from '@/lib/finance-utils';

/**
 * GET /api/finance/fee-invoices
 * List fee invoices with optional filters.
 * Query params: studentProfileId, status, semesterNumber, page, limit
 */
export async function GET(req: Request) {
    try {
        await dbConnect();
        const { searchParams } = new URL(req.url);
        const studentProfileId = searchParams.get('studentProfileId');
        const status = searchParams.get('status');
        const semesterNumber = searchParams.get('semesterNumber');
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '50');

        const query: Record<string, unknown> = {};
        if (studentProfileId) query.studentProfileId = studentProfileId;
        if (status) query.status = status;
        if (semesterNumber) query.semesterNumber = parseInt(semesterNumber, 10);

        const [invoices, total] = await Promise.all([
            FeeInvoice.find(query)
                .populate({
                    path: 'studentProfileId',
                    select: 'registrationNumber name email currentSemester',
                })
                .populate({
                    path: 'feeStructureId',
                    select: 'semesterNumber totalAmount feeHeads',
                    populate: { path: 'batchId', select: 'year season programId' },
                })
                .sort({ dueDate: 1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .lean({ virtuals: true }),
            FeeInvoice.countDocuments(query),
        ]);

        return NextResponse.json({ invoices, total, page, limit });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

/**
 * POST /api/finance/fee-invoices
 * Create a fee invoice for a student (links StudentProfile → FeeStructure).
 *
 * Body: { studentProfileId, feeStructureId, dueDate, discountAmount?, notes? }
 *
 * NOTE: For payment collection, use POST /api/finance/fee-collection.
 */
export async function POST(req: Request) {
    try {
        const session = await getServerSession();
        if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        await dbConnect();
        const body = await req.json();
        const { studentProfileId, feeStructureId, dueDate, discountAmount, notes } = body;

        if (!studentProfileId || !feeStructureId || !dueDate) {
            return NextResponse.json(
                { error: 'studentProfileId, feeStructureId, and dueDate are required.' },
                { status: 400 }
            );
        }

        const feeStructure = await FeeStructure.findById(feeStructureId).lean();
        if (!feeStructure) return NextResponse.json({ error: 'Fee structure not found.' }, { status: 404 });

        const invoice = await FeeInvoice.create({
            studentProfileId,
            feeStructureId,
            semesterNumber: feeStructure.semesterNumber,
            dueDate: new Date(dueDate),
            totalAmount: feeStructure.totalAmount,
            discountAmount: discountAmount || 0,
            amountPaid: 0,
            penaltyAmount: 0,
            status: 'PENDING',
            notes,
        });

        await writeAuditLog({
            action: 'CREATE',
            entityType: 'FeeInvoice',
            entityId: invoice._id.toString(),
            performedBy: session.user.email || 'unknown',
            performedByName: session.user.name || undefined,
            newState: { studentProfileId, totalAmount: feeStructure.totalAmount, semesterNumber: feeStructure.semesterNumber },
        });

        return NextResponse.json(invoice, { status: 201 });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
