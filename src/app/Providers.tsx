'use client';

import { SessionProvider } from 'next-auth/react';
import { ReactNode } from 'react';
import NavigationLoader from '@/components/ui/NavigationLoader';

export default function Providers({ children }: { children: ReactNode }) {
    return (
        <SessionProvider>
            <NavigationLoader />
            {children}
        </SessionProvider>
    );
}
