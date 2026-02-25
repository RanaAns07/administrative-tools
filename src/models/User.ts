import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
    name: string;
    email: string;
    password?: string;
    role: 'SuperAdmin' | 'Admin' | 'Staff';
    isActive: boolean;
    permissions: Record<string, any>;
    createdAt: Date;
    updatedAt: Date;
}

const userSchema = new Schema<IUser>(
    {
        name: { type: String, required: true },
        email: { type: String, required: true, unique: true },
        password: { type: String, required: true },
        role: {
            type: String,
            enum: ['SuperAdmin', 'Admin', 'Staff'],
            default: 'Staff',
        },
        isActive: { type: Boolean, default: true },
        permissions: { type: Schema.Types.Mixed, default: {} },
    },
    { timestamps: true }
);

const User = mongoose.models.User || mongoose.model<IUser>('User', userSchema);

export default User;
