'use client';

import React, { useState, useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import Image from "next/image";

function NavigationLoaderContent() {
    const [isLoading, setIsLoading] = useState(false);
    const pathname = usePathname();
    const searchParams = useSearchParams();

    // Reset loading state when the route successfully changes
    useEffect(() => {
        setIsLoading(false);
    }, [pathname, searchParams]);

    // Listen to ALL clicks globally to detect internal link navigations
    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            const anchor = (e.target as Element).closest('a');

            if (anchor && anchor.href) {
                try {
                    const url = new URL(anchor.href, window.location.origin);

                    // Verify it is an internal App routing link
                    if (
                        url.origin === window.location.origin &&
                        anchor.target !== '_blank' &&
                        !e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey
                    ) {
                        // Check if we are actually navigating to a new path or new query params
                        const isNewRoute = url.pathname !== window.location.pathname || url.search !== window.location.search;

                        if (isNewRoute) {
                            setIsLoading(true);
                        }
                    }
                } catch (err) {
                    // Ignore invalid URLs
                }
            }
        };

        // Capture phase to catch the click before any programmatic preventDefault
        document.addEventListener('click', handleClick, true);
        return () => document.removeEventListener('click', handleClick, true);
    }, []);

    if (!isLoading) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-white/70 backdrop-blur-sm transition-all duration-200">
            <div className="flex flex-col items-center">
                <div className="animate-pulse">
                    <Image
                        src="/Logo.png"
                        alt="Lahore Leads University Logo"
                        width={200}
                        height={200}
                        className="object-contain drop-shadow-md"
                        priority
                    />
                </div>
            </div>
        </div>
    );
}

export default function NavigationLoader() {
    return (
        <React.Suspense fallback={null}>
            <NavigationLoaderContent />
        </React.Suspense>
    );
}
