import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import bcrypt from 'bcryptjs';

export async function PUT(req: Request, { params }: { params: { id: string } }) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user || (session.user.role !== 'SuperAdmin' && session.user.role !== 'Admin')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const id = params.id;
        if (!id) {
            return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
        }

        const body = await req.json();
        const { name, email, role, permissions, password } = body;

        await dbConnect();

        const user = await User.findById(id);
        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Update fields
        if (name) user.name = name;
        if (email) user.email = email;
        if (role) user.role = role;
        if (permissions) user.permissions = permissions;

        // Only hash and update password if a new one is provided and not empty
        if (password && password.trim() !== '') {
            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(password, salt);
        }

        await user.save();

        // Convert to plain object and remove password for response
        const updatedUser = user.toObject();
        delete updatedUser.password;

        return NextResponse.json(updatedUser, { status: 200 });
    } catch (error) {
        console.error('Error updating user:', error);
        return NextResponse.json(
            { error: 'Failed to update user' },
            { status: 500 }
        );
    }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user || (session.user.role !== 'SuperAdmin' && session.user.role !== 'Admin')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const id = params.id;
        if (!id) {
            return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
        }

        // Prevent self-deletion
        if (id === session.user.id) {
            return NextResponse.json({ error: 'Cannot delete active session user' }, { status: 400 });
        }

        await dbConnect();

        const deletedUser = await User.findByIdAndDelete(id);

        if (!deletedUser) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        return NextResponse.json({ message: 'User deleted successfully' }, { status: 200 });
    } catch (error) {
        console.error('Error deleting user:', error);
        return NextResponse.json(
            { error: 'Failed to delete user' },
            { status: 500 }
        );
    }
}
