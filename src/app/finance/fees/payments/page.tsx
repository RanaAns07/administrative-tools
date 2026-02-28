import dbConnect from '@/lib/mongodb';
import FeePayment from '@/models/finance/FeePayment';
import '@/models/finance/FeeInvoice'; // Required for population
import '@/models/university/StudentProfile'; // Required for nested population
import FeePaymentsClient from './FeePaymentsClient';

export const dynamic = 'force-dynamic';

export default async function FeePaymentsPage() {
    await dbConnect();

    // Fetch the 100 most recent payment receipts for the ledger view
    const rawPayments = await FeePayment.find({})
        .populate({
            path: 'feeInvoice',
            select: 'invoiceNumber studentProfileId',
            populate: {
                path: 'studentProfileId',
                select: 'name registrationNumber'
            }
        })
        .sort({ paymentDate: -1, createdAt: -1 })
        .limit(100)
        .lean();

    return (
        <div className="max-w-[1200px] mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Fee Payments Ledger</h1>
                <p className="text-sm text-gray-500 mt-1">
                    Complete record of all student fee receipts, including cash, bank transfers, and reversals.
                </p>
            </div>

            <FeePaymentsClient initialPayments={JSON.parse(JSON.stringify(rawPayments))} />
        </div>
    );
}
