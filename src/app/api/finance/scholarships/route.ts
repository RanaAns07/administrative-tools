/**
 * @file /api/finance/scholarships/route.ts
 * @description Scholarship CRUD API
 */

export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import mongoose from 'mongoose';
import dbConnect from '@/lib/mongodb';
import Scholarship from '@/models/finance/Scholarship';
import { writeAuditLog } from '@/lib/finance-utils';

export async function GET(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await dbConnect();

    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get('studentId');
    const query: Record<string, unknown> = {};
    if (studentId && mongoose.isValidObjectId(studentId)) query.studentProfileId = studentId;

    const scholarships = await Scholarship.find(query)
        .populate('studentProfileId', 'name registrationNumber')
        .populate('approvedBy', 'name email')
        .sort({ createdAt: -1 })
        .lean();

    return NextResponse.json(scholarships);
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await dbConnect();

    let body: {
        studentProfileId: string;
        name: string;
        category: string;
        discountType: 'PERCENTAGE' | 'FIXED';
        discountValue: number;
        validFromSemester: number;
        validToSemester: number;
        notes?: string;
    };
    try { body = await req.json(); } catch {
        return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 });
    }

    if (!body.studentProfileId || !body.name || !body.category || !body.discountType || body.discountValue === undefined) {
        return NextResponse.json({ error: 'studentProfileId, name, category, discountType, discountValue are required.' }, { status: 400 });
    }

    if (body.discountType === 'PERCENTAGE' && (body.discountValue < 0 || body.discountValue > 100)) {
        return NextResponse.json({ error: 'PERCENTAGE discount value must be between 0 and 100.' }, { status: 400 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const approvedBy = new mongoose.Types.ObjectId((session.user as any)._id || '000000000000000000000000');

    const scholarship = await Scholarship.create({
        ...body,
        studentProfileId: new mongoose.Types.ObjectId(body.studentProfileId),
        approvedBy,
        approvedAt: new Date(),
    });

    await writeAuditLog({
        action: 'SCHOLARSHIP_GRANTED',
        entityType: 'Scholarship',
        entityId: scholarship._id.toString(),
        performedBy: session.user.email || 'unknown',
        newState: { studentId: body.studentProfileId, name: body.name, discountType: body.discountType, discountValue: body.discountValue },
    });

    return NextResponse.json(scholarship, { status: 201 });
}

export async function PATCH(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await dbConnect();

    let body: { id: string; isActive?: boolean; discountValue?: number; validToSemester?: number; notes?: string };
    try { body = await req.json(); } catch {
        return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 });
    }

    const { id, ...updates } = body;
    if (!id || !mongoose.isValidObjectId(id)) {
        return NextResponse.json({ error: 'Valid scholarship id is required.' }, { status: 400 });
    }

    const scholarship = await Scholarship.findByIdAndUpdate(id, updates, { new: true });
    if (!scholarship) return NextResponse.json({ error: 'Scholarship not found.' }, { status: 404 });

    return NextResponse.json(scholarship);
}
