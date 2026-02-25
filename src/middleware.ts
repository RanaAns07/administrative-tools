import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
    function middleware(req) {
        if (req.nextauth.token?.role === 'SuperAdmin') {
            return NextResponse.next();
        }

        if (req.nextUrl.pathname.startsWith('/admin') && req.nextauth.token?.role !== 'Admin') {
            return NextResponse.rewrite(new URL('/unauthorized', req.url));
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
