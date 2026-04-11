import { NextResponse } from 'next/server';

/**
 * Defensive Environment Variable Check
 * Prevents server initialization if critical keys are missing.
 */
const requiredEnv = ['MONGODB_URI', 'NEXTAUTH_SECRET'];
for (const envName of requiredEnv) {
    if (!process.env[envName]) {
        throw new Error(`CRITICAL: Missing environment variable ${envName}`);
    }
}

type ApiHandler = (req: Request, ...args: any[]) => Promise<NextResponse>;

/**
 * Global API Error Wrapper
 * Logs errors with stack traces to server logs and returns structured JSON error responses.
 */
export function withErrorHandler(handler: ApiHandler) {
    return async (req: Request, ...args: any[]) => {
        try {
            return await handler(req, ...args);
        } catch (error: any) {
            console.error('API ERROR:', {
                url: req.url,
                method: req.method,
                message: error.message,
                stack: error.stack,
            });

            return NextResponse.json(
                {
                    success: false,
                    message: 'Internal server error',
                    error: error.message,
                    stack: process.env.NODE_ENV === 'development' || process.env.DEBUG === 'true' ? error.stack : undefined,
                },
                { status: 500 }
            );
        }
    };
}
