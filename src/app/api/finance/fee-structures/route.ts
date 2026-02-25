import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import dbConnect from '@/lib/mongodb';
import FeeStructure from '@/models/finance/FeeStructure';
import { writeAuditLog } from '@/lib/finance-utils';

export async function GET(req: Request) {
    try {
        await dbConnect();
        const { searchParams } = new URL(req.url);
        const program = searchParams.get('program');
        const query: Record<string, unknown> = { isActive: true };
        if (program) query.programName = new RegExp(program, 'i');

        const structures = await FeeStructure.find(query).sort({ createdAt: -1 }).lean();
        return NextResponse.json(structures);
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
        const { programName, semester, academicYear, feeComponents, lateFeePerDay, gracePeriodDays } = body;

        if (!programName || !semester || !academicYear || !feeComponents?.length) {
            return NextResponse.json({ error: 'programName, semester, academicYear, feeComponents are required.' }, { status: 400 });
        }

        const totalAmount = feeComponents.reduce((s: number, c: any) => s + (c.amount || 0), 0);

        const fs = await FeeStructure.create({
            programName, semester, academicYear, feeComponents,
            totalAmount, lateFeePerDay: lateFeePerDay || 0,
            gracePeriodDays: gracePeriodDays || 5,
            isActive: true,
            createdBy: session.user.email || 'unknown',
        });

        await writeAuditLog({
            action: 'CREATE',
            entityType: 'FeeStructure',
            entityId: fs._id.toString(),
            entityReference: `${programName} - ${semester}`,
            performedBy: session.user.email || 'unknown',
        });

        return NextResponse.json(fs, { status: 201 });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
