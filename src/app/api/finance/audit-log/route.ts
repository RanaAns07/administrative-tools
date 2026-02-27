/* eslint-disable @typescript-eslint/no-explicit-any */
export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import AuditLog from '@/models/finance/AuditLog';

// GET /api/finance/audit-log
export async function GET(req: Request) {
    try {
        await dbConnect();
        const { searchParams } = new URL(req.url);
        const entityType = searchParams.get('entityType');
        const action = searchParams.get('action');
        const limit = parseInt(searchParams.get('limit') || '100');

        const query: Record<string, unknown> = {};
        if (entityType) query.entityType = entityType;
        if (action) query.action = action;

        const logs = await AuditLog.find(query)
            .sort({ performedAt: -1 })
            .limit(limit)
            .lean();

        return NextResponse.json(logs);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
