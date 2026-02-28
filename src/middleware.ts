import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
    function middleware(req) {
        const token = req.nextauth.token;
        if (!token) return NextResponse.rewrite(new URL('/login', req.url));

        if (token.role === 'SuperAdmin') {
            return NextResponse.next();
        }

        const pathname = req.nextUrl.pathname;

        if (pathname.startsWith('/admin') && token.role !== 'Admin') {
            return NextResponse.rewrite(new URL('/unauthorized', req.url));
        }

        if (pathname.startsWith('/finance')) {
            const permissions: any = token.permissions || {};
            if (token.role !== 'Admin' && !permissions?.finance?.hasAccess) {
                return NextResponse.rewrite(new URL('/unauthorized', req.url));
            }
        }
    },
    {
        callbacks: {
            authorized: ({ token }) => !!token,
        }
    }
);

export const config = {
    matcher: ["/admin/:path*", "/finance/:path*", "/admissions/:path*", "/hr/:path*"]
};
