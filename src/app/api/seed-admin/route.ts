import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import bcrypt from 'bcryptjs';

export async function POST(req: NextRequest) {
    try {
        const setupKey = req.headers.get('x-setup-key');

        // 5. Security check
        if (setupKey !== 'leads-init-2026') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 1. Connect to database
        await dbConnect();

        // 2. Check if SuperAdmin exists
        const existingAdmin = await User.findOne({ role: 'SuperAdmin' });
        if (existingAdmin) {
            return NextResponse.json(
                { message: 'Admin already initialized' },
                { status: 400 }
            );
        }

        // 3. Create SuperAdmin
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('LeadsAdmin2026!', salt);

        const superAdmin = new User({
            name: 'System Administrator',
            email: 'admin@leads.edu.pk',
            password: hashedPassword,
            role: 'SuperAdmin',
            permissions: {
                adminCenter: { fullAccess: true },
                finance: { fullAccess: true },
                admissions: { fullAccess: true },
            },
            isActive: true,
        });

        // 4. Save to MongoDB
        await superAdmin.save();

        return NextResponse.json(
            { message: 'SuperAdmin initialized successfully' },
            { status: 201 }
        );
    } catch (error) {
        console.error('Error seeding admin user:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
