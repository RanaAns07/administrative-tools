import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import dbConnect from '@/lib/mongodb';
import UniversityStaff from '@/models/finance/UniversityStaff';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    try {
        await dbConnect();
        const staff = await UniversityStaff.find({}).sort({ name: 1 }).lean();
        return NextResponse.json(staff);
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

        // Basic validation
        if (!body.name || !body.role || !body.department || !body.employmentType) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const newStaff = await UniversityStaff.create(body);

        return NextResponse.json(newStaff, { status: 201 });
    } catch (error: any) {
        // Handle Mongoose validation errors
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map((val: any) => val.message);
            return NextResponse.json({ error: messages.join(', ') }, { status: 400 });
        }
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
