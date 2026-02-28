import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import dbConnect from '@/lib/mongodb';
import StudentProfile from '@/models/university/StudentProfile';
import FeeInvoice from '@/models/finance/FeeInvoice';
import Refund from '@/models/finance/Refund';
import StudentAdvanceBalance from '@/models/finance/StudentAdvanceBalance';

export async function GET(req: Request, { params }: { params: { id: string } }) {
    try {
        const session = await getServerSession();
        if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        await dbConnect();

        const student = await StudentProfile.findById(params.id).populate({
            path: 'batchId',
            populate: { path: 'programId' }
        }).lean();

        if (!student) return NextResponse.json({ error: 'Student not found' }, { status: 404 });

        const [invoices, refunds, advanceBalance] = await Promise.all([
            FeeInvoice.find({ studentProfileId: params.id }).sort({ issueDate: -1 }).lean(),
            Refund.find({ studentProfileId: params.id }).sort({ processedAt: -1 }).lean(),
            StudentAdvanceBalance.findOne({ studentProfileId: params.id }).lean(),
        ]);

        return NextResponse.json({
            ...student,
            invoices,
            refunds,
            advanceBalance: advanceBalance?.balance || 0,
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
