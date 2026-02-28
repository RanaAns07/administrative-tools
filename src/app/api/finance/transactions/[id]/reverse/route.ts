import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import dbConnect from '@/lib/mongodb';
import { FinanceTransactionService } from '@/lib/finance/FinanceTransactionService';

export async function POST(req: Request, { params }: { params: { id: string } }) {
    try {
        const session = await getServerSession();
        if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await req.json();
        const { reason } = body;

        if (!reason || reason.trim().length < 5) {
            return NextResponse.json({ error: 'A valid reason (min 5 chars) must be provided for reversal.' }, { status: 400 });
        }

        await dbConnect();

        const result = await FinanceTransactionService.reverseTransaction({
            originalTxId: params.id,
            reason,
            performedBy: (session.user as any).id || session.user.email || 'system',
        });

        return NextResponse.json({ success: true, reversalTxId: result.reversalTxId });
    } catch (error: any) {
        console.error('Reversal Error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to reverse transaction' },
            { status: 400 }
        );
    }
}
