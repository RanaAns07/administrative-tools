import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import dbConnect from '@/lib/mongodb';
import UniversityStaff from '@/models/finance/UniversityStaff';
import SalarySlip from '@/models/finance/SalarySlip';
import Wallet from '@/models/finance/Wallet';
import mongoose from 'mongoose';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    try {
        const session = await getServerSession();
        if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        await dbConnect();
        const body = await req.json();

        const { month, year, walletId, slips } = body;

        if (!month || !year || !walletId || !slips || !slips.length) {
            return NextResponse.json({ error: 'Missing required fields or empty slips' }, { status: 400 });
        }

        const wallet = await Wallet.findById(walletId);
        if (!wallet) return NextResponse.json({ error: 'Invalid wallet selected' }, { status: 400 });

        const sessionMongoose = await mongoose.startSession();
        let createdSlips: any[] = [];

        try {
            await sessionMongoose.withTransaction(async () => {
                // 1. Calculate Total Net Payable
                const totalNetPayable = slips.reduce((sum: number, slip: any) => sum + slip.netPayable, 0);

                // 2. Validate Wallet Balance
                if (wallet.currentBalance < totalNetPayable) {
                    throw new Error(`Insufficient funds in ${wallet.name}. Required: ${totalNetPayable}, Available: ${wallet.currentBalance}`);
                }

                // 3. Update Wallet Balance atomically
                const updatedWallet = await Wallet.findByIdAndUpdate(
                    walletId,
                    { $inc: { currentBalance: -totalNetPayable } },
                    { session: sessionMongoose, new: true }
                );

                if (!updatedWallet || updatedWallet.currentBalance < 0) {
                    throw new Error('Transaction failed: Insufficient wallet balance during processing.');
                }

                const performedBy = session?.user?.email
                    ? await mongoose.models.User?.findOne({ email: session.user.email }).select('_id').lean()
                    : null;
                const performerId = performedBy?._id || new mongoose.Types.ObjectId();

                // 4. Process each slip
                for (const slipData of slips) {
                    // Check if already paid for this month/year
                    const existing = await SalarySlip.findOne({
                        staffId: slipData.staffId,
                        month,
                        year,
                        status: 'PAID'
                    }).session(sessionMongoose);

                    if (existing) {
                        const staff = await UniversityStaff.findById(slipData.staffId).session(sessionMongoose);
                        throw new Error(`Salary already disbursed for ${staff?.name || 'staff'} for ${month}/${year}`);
                    }

                    const notes = slipData.notes || `Salary for ${month}/${year}`;

                    // Record Transaction First to get ID
                    const [tx] = await mongoose.models.Transaction.create([{
                        txType: 'PAYROLL_PAYMENT',
                        amount: slipData.netPayable,
                        walletId: walletId,
                        referenceModel: 'SalarySlip',
                        notes: notes,
                        performedBy: performerId,
                        date: new Date()
                    }], { session: sessionMongoose });

                    // Create Salary Slip linked to Transaction
                    const [newSlip] = await SalarySlip.create([{
                        staffId: slipData.staffId,
                        month,
                        year,
                        baseAmount: slipData.baseSalary,
                        allowances: slipData.allowances,
                        deductions: slipData.deductions,
                        netPayable: slipData.netPayable,
                        status: 'PAID',
                        paidDate: new Date(),
                        transactionId: tx._id,
                        notes: notes
                    }], { session: sessionMongoose });

                    tx.referenceId = newSlip._id;
                    await tx.save({ session: sessionMongoose });

                    createdSlips.push(newSlip);
                }
            });
            await sessionMongoose.endSession();
        } catch (error: any) {
            await sessionMongoose.endSession();
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        return NextResponse.json({ success: true, count: createdSlips.length });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
