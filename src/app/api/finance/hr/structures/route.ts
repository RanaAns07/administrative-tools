import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import dbConnect from '@/lib/mongodb';
import StaffPayComponent from '@/models/finance/StaffPayComponent';
import UniversityStaff from '@/models/finance/UniversityStaff'; // Needed to populate

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    try {
        await dbConnect();

        // Populate staff details (name, department, role) to show in the UI
        const components = await StaffPayComponent.find()
            .populate('staffId', 'name department role employmentType')
            .sort({ createdAt: -1 })
            .lean();

        return NextResponse.json(components);
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
        if (!body.staffId || !body.componentType || !body.name || body.value === undefined) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const newComponent = await StaffPayComponent.create(body);

        // Re-fetch to populate staff data for the frontend
        const populatedComponent = await StaffPayComponent.findById(newComponent._id)
            .populate('staffId', 'name department role employmentType')
            .lean();

        return NextResponse.json(populatedComponent, { status: 201 });
    } catch (error: any) {
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map((val: any) => val.message);
            return NextResponse.json({ error: messages.join(', ') }, { status: 400 });
        }
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
