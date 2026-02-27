import dbConnect from '@/lib/mongodb';
import SalarySlip from '@/models/finance/SalarySlip';
import Wallet from '@/models/finance/Wallet';
import '@/models/finance/UniversityStaff'; // Ensure Staff model is registered
import PayrollDisburseForm from './PayrollDisburseForm';

export const dynamic = 'force-dynamic';

export default async function PayrollPage() {
    await dbConnect();

    const rawSlips = await SalarySlip.find({ status: 'DRAFT' })
        .populate('staffId', 'name role department')
        .sort({ year: -1, month: -1, 'staffId.name': 1 })
        .lean();

    const rawWallets = await Wallet.find({ isActive: true })
        .sort({ name: 1 })
        .lean();

    return (
        <PayrollDisburseForm
            slips={JSON.parse(JSON.stringify(rawSlips))}
            wallets={JSON.parse(JSON.stringify(rawWallets))}
        />
    );
}
