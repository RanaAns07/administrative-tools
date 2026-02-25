export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import dbConnect from '@/lib/mongodb';
import FeeInvoice from '@/models/finance/FeeInvoice';
import FeeStructure from '@/models/finance/FeeStructure';
import { generateInvoiceNumber, writeAuditLog } from '@/lib/finance-utils';

// GET /api/finance/fee-invoices
export async function GET(req: Request) {
    try {
        await dbConnect();
        const { searchParams } = new URL(req.url);
        const studentId = searchParams.get('studentId');
        const status = searchParams.get('status');
        const program = searchParams.get('program');
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '50');

        const query: Record<string, unknown> = {};
        if (studentId) query.studentId = studentId;
        if (status) query.status = status;
        if (program) query.program = new RegExp(program, 'i');

        const [invoices, total] = await Promise.all([
            FeeInvoice.find(query)
                .populate('feeStructure', 'programName semester')
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .lean(),
            FeeInvoice.countDocuments(query),
        ]);

        return NextResponse.json({ invoices, total, page, limit });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// POST /api/finance/fee-invoices
export async function POST(req: Request) {
    try {
        const session = await getServerSession();
        if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        await dbConnect();
        const body = await req.json();
        const { studentId, studentName, rollNumber, program, feeStructureId, semester, academicYear, dueDate } = body;

        if (!studentId || !studentName || !rollNumber || !feeStructureId || !dueDate) {
            return NextResponse.json({ error: 'studentId, studentName, rollNumber, feeStructureId, dueDate are required.' }, { status: 400 });
        }

        const feeStructure = await FeeStructure.findById(feeStructureId).lean();
        if (!feeStructure) return NextResponse.json({ error: 'Fee structure not found.' }, { status: 404 });

        const invoiceNumber = await generateInvoiceNumber();

        const invoice = await FeeInvoice.create({
            invoiceNumber,
            studentId,
            studentName,
            rollNumber,
            program: program || feeStructure.programName,
            feeStructure: feeStructureId,
            semester: semester || feeStructure.semester,
            academicYear: academicYear || feeStructure.academicYear,
            dueDate: new Date(dueDate),
            totalAmount: feeStructure.totalAmount,
            discountAmount: 0,
            paidAmount: 0,
            penaltyAmount: 0,
            status: 'UNPAID',
            createdBy: session.user.email || 'unknown',
        });

        await writeAuditLog({
            action: 'CREATE',
            entityType: 'FeeInvoice',
            entityId: invoice._id.toString(),
            entityReference: invoice.invoiceNumber,
            performedBy: session.user.email || 'unknown',
            performedByName: session.user.name || undefined,
            newState: { studentId, totalAmount: feeStructure.totalAmount },
        });

        return NextResponse.json(invoice, { status: 201 });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
