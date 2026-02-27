import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import dbConnect from '@/lib/mongodb';
import Category from '@/models/finance/Category';
import { writeAuditLog } from '@/lib/finance-utils';

export async function POST(req: Request) {
    try {
        const session = await getServerSession();
        if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        await dbConnect();
        const body = await req.json();
        const { name, type, description } = body;

        if (!name || typeof name !== 'string') {
            return NextResponse.json({ error: 'Category name is required' }, { status: 400 });
        }

        if (!['INCOME', 'EXPENSE'].includes(type)) {
            return NextResponse.json({ error: 'Valid category type (INCOME or EXPENSE) is required' }, { status: 400 });
        }

        // Check for duplicates
        const existingCategory = await Category.findOne({ name: name.trim(), type });
        if (existingCategory) {
            return NextResponse.json({ error: `A category named "${name.trim()}" already exists for ${type}.` }, { status: 400 });
        }

        const category = await Category.create({
            name: name.trim(),
            type,
            description: description?.trim() || undefined,
            isActive: true,
        });

        await writeAuditLog({
            action: 'CREATE',
            entityType: 'Category',
            entityId: category._id.toString(),
            entityReference: category.name,
            performedBy: session.user.email || 'unknown',
            newState: { name: category.name, type: category.type },
        });

        return NextResponse.json(category, { status: 201 });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
