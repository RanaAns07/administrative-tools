import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import dbConnect from '@/lib/mongodb';
import LoanAdvance from '@/models/finance/LoanAdvance';
import Wallet from '@/models/finance/Wallet';
import mongoose from 'mongoose';
import UniversityStaff from '@/models/finance/UniversityStaff'; // Needed to populate

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    try {
        await dbConnect();
        const loans = await LoanAdvance.find()
            .populate('staffId', 'name department role')
            .populate('walletId', 'name')
            .sort({ createdAt: -1 })
            .lean();
        return NextResponse.json(loans);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const session = await getServerSession();
        if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        await dbConnect();
        const body = await req.json();

        // Expects: { staffId, loanType, amount, monthlyInstallment, walletId, notes, disbursedDate }
        if (!body.staffId || !body.amount || !body.walletId || !body.monthlyInstallment) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const wallet = await Wallet.findById(body.walletId);
        if (!wallet) return NextResponse.json({ error: 'Invalid wallet' }, { status: 400 });
        if (wallet.currentBalance < body.amount) {
            return NextResponse.json({ error: `Insufficient funds in ${wallet.name}. Require ${body.amount}, available ${wallet.currentBalance}` }, { status: 400 });
        }

        const sessionMongoose = await mongoose.startSession();
        let newLoan: any = null;

        try {
            await sessionMongoose.withTransaction(async () => {
                // Update Wallet (reduce balance)
                const updatedWallet = await Wallet.findByIdAndUpdate(
                    body.walletId,
                    { $inc: { currentBalance: -body.amount } },
                    { session: sessionMongoose, new: true }
                );

                if (!updatedWallet || updatedWallet.currentBalance < 0) {
                    throw new Error('Insufficient wallet balance');
                }

                const performedBy = session?.user?.email
                    ? await mongoose.models.User?.findOne({ email: session.user.email }).select('_id').lean()
                    : null;
                const performerId = performedBy?._id || new mongoose.Types.ObjectId();

                // Create Transaction
                const [tx] = await mongoose.models.Transaction.create([{
                    txType: body.loanType === 'LOAN' ? 'EXPENSE_PAYMENT' : 'WALLET_TRANSFER_OUT', // Using closest existing or standard txType
                    amount: body.amount,
                    walletId: body.walletId,
                    referenceModel: 'LoanAdvance',
                    notes: `Staff ${body.loanType}: ${body.notes || ''}`,
                    performedBy: performerId,
                    date: new Date(body.disbursedDate || Date.now())
                }], { session: sessionMongoose });

                // Create Loan
                const loanNumber = `LN-${Date.now().toString().slice(-6)}`;
                const [loan] = await LoanAdvance.create([{
                    staffId: body.staffId,
                    loanNumber,
                    loanType: body.loanType,
                    amount: body.amount,
                    disbursedDate: new Date(body.disbursedDate || Date.now()),
                    monthlyInstallment: body.monthlyInstallment,
                    remainingBalance: body.amount,
                    totalRepaid: 0,
                    status: 'ACTIVE',
                    transactionId: tx._id,
                    walletId: body.walletId,
                    notes: body.notes,
                    createdBy: session?.user?.name || session?.user?.email || 'System'
                }], { session: sessionMongoose });

                tx.referenceId = loan._id;
                await tx.save({ session: sessionMongoose });

                newLoan = loan;
            });
            await sessionMongoose.endSession();
        } catch (error: any) {
            await sessionMongoose.endSession();
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        const populatedLoan = await LoanAdvance.findById(newLoan?._id)
            .populate('staffId', 'name department role')
            .populate('walletId', 'name')
            .lean();

        return NextResponse.json(populatedLoan, { status: 201 });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
