/* eslint-disable @typescript-eslint/no-explicit-any */
export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import dbConnect from '@/lib/mongodb';
import Vendor from '@/models/finance/Vendor';
import { generateSequenceNumber, writeAuditLog } from '@/lib/finance-utils';

export async function GET(req: Request) {
    try {
        await dbConnect();
        const { searchParams } = new URL(req.url);
        const status = searchParams.get('status') || 'ACTIVE';
        const search = searchParams.get('search');
        const query: Record<string, unknown> = {};
        if (status !== 'ALL') query.status = status;
        if (search) query.companyName = new RegExp(search, 'i');

        const vendors = await Vendor.find(query).sort({ companyName: 1 }).lean();
        return NextResponse.json(vendors);
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
        if (!body.companyName || !body.payableAccountCode) {
            return NextResponse.json({ error: 'companyName and payableAccountCode are required.' }, { status: 400 });
        }

        const vendorCode = await generateSequenceNumber('VND', Vendor, 'vendorCode');
        const vendor = await Vendor.create({ ...body, vendorCode, createdBy: session.user.email || 'unknown' });

        await writeAuditLog({
            action: 'CREATE',
            entityType: 'Vendor',
            entityId: vendor._id.toString(),
            entityReference: `${vendorCode} - ${body.companyName}`,
            performedBy: session.user.email || 'unknown',
        });

        return NextResponse.json(vendor, { status: 201 });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
