import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import dbConnect from '@/lib/mongodb';
import Program from '@/models/university/Program';
import { writeAuditLog } from '@/lib/finance-utils';

export async function POST(req: Request) {
    try {
        const session = await getServerSession();
        if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        await dbConnect();
        const body = await req.json();
        const { name, code, totalSemesters } = body;

        if (!name || typeof name !== 'string') {
            return NextResponse.json({ error: 'Program name is required' }, { status: 400 });
        }
        if (!code || typeof code !== 'string') {
            return NextResponse.json({ error: 'Program code is required' }, { status: 400 });
        }

        // Check duplicates
        const existing = await Program.findOne({ $or: [{ name }, { code }] });
        if (existing) {
            return NextResponse.json({ error: `A program with name "${existing.name}" or code "${existing.code}" already exists.` }, { status: 400 });
        }

        const program = await Program.create({
            name: name.trim(),
            code: code.trim().toUpperCase(),
            totalSemesters: Number(totalSemesters) || 8,
            isActive: true,
        });

        await writeAuditLog({
            action: 'CREATE',
            entityType: 'Program',
            entityId: program._id.toString(),
            entityReference: program.code,
            performedBy: session.user.email || 'unknown',
            newState: { name: program.name, code: program.code, totalSemesters: program.totalSemesters },
        });

        return NextResponse.json(program, { status: 201 });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
