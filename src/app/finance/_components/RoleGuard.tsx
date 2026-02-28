'use client';

import { useSession } from 'next-auth/react';
import { ReactNode } from 'react';

interface RoleGuardProps {
    children: ReactNode;
    allowedRoles?: string[];
    requireFinanceAccess?: boolean;
    fallback?: ReactNode;
}

export default function RoleGuard({ children, allowedRoles, requireFinanceAccess = true, fallback = null }: RoleGuardProps) {
    const { data: session, status } = useSession();

    if (status === 'loading') return null;

    if (!session?.user) return <>{fallback}</>;

    const userRole = session.user.role;
    const permissions: any = session.user.permissions || {};

    // SuperAdmin always has access
    if (userRole === 'SuperAdmin') return <>{children}</>;

    // Role check
    if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(userRole)) {
        return <>{fallback}</>;
    }

    // Finance specific check
    if (requireFinanceAccess && userRole !== 'Admin' && !permissions?.finance?.hasAccess) {
        return <>{fallback}</>;
    }

    return <>{children}</>;
}
