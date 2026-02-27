import { DefaultSession } from 'next-auth';

declare module 'next-auth' {
    interface Session {
        user: {
            id: string;
            role: 'SuperAdmin' | 'Admin' | 'Staff';
            permissions: Record<string, unknown>;
        } & DefaultSession['user'];
    }

    interface User {
        id: string;
        role: 'SuperAdmin' | 'Admin' | 'Staff';
        permissions: Record<string, unknown>;
    }
}

declare module 'next-auth/jwt' {
    interface JWT {
        id: string;
        role: 'SuperAdmin' | 'Admin' | 'Staff';
        permissions: Record<string, unknown>;
    }
}
