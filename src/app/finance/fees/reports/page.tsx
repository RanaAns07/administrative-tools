import dbConnect from '@/lib/mongodb';
import FeeInvoice from '@/models/finance/FeeInvoice';
import StudentAdvanceBalance from '@/models/finance/StudentAdvanceBalance';
import FeeReportsClient from './FeeReportsClient';
import '@/models/university/StudentProfile';

export const dynamic = 'force-dynamic';

export default async function FeeReportsPage() {
    await dbConnect();

    // Calculate sum of all invoices
    const invoiceAgg = await FeeInvoice.aggregate([
        {
            $group: {
                _id: null,
                totalInvoiced: { $sum: { $subtract: ['$totalAmount', '$discountAmount'] } },
                totalCollected: { $sum: '$amountPaid' },
                totalArrears: { $sum: '$arrears' }
            }
        }
    ]);

    const advancesAgg = await StudentAdvanceBalance.aggregate([
        { $group: { _id: null, totalAdvances: { $sum: '$balance' } } }
    ]);

    const metrics = {
        totalInvoiced: invoiceAgg[0]?.totalInvoiced || 0,
        totalCollected: invoiceAgg[0]?.totalCollected || 0,
        totalArrears: invoiceAgg[0]?.totalArrears || 0,
        totalAdvances: advancesAgg[0]?.totalAdvances || 0,
    };

    const recentInvoices = await FeeInvoice.find({})
        .populate('studentProfileId', 'name')
        .sort({ issueDate: -1, createdAt: -1 })
        .limit(10)
        .lean();

    return (
        <div className="max-w-[1200px] mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Fee Highlights & Reports</h1>
                <p className="text-sm text-gray-500 mt-1">
                    Snapshot of total fee collections, arrears, advances, and recent financial activity.
                </p>
            </div>

            <FeeReportsClient
                summaryMetrics={metrics}
                recentInvoices={JSON.parse(JSON.stringify(recentInvoices))}
            />
        </div>
    );
}
