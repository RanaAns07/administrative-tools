import dbConnect from '@/lib/mongodb';
import RecurringExpense from '@/models/finance/RecurringExpense';
import Category from '@/models/finance/Category';
import Wallet from '@/models/finance/Wallet';
import Vendor from '@/models/finance/Vendor';
import RecurringClient from './RecurringClient';

export const dynamic = 'force-dynamic';

export default async function RecurringExpensesPage() {
    await dbConnect();

    const recurringExpenses = await RecurringExpense.find({})
        .populate('categoryId', 'name')
        .populate('walletId', 'name')
        .populate('vendorId', 'name')
        .sort({ isActive: -1, createdAt: -1 })
        .lean();

    const categories = await Category.find({ type: 'EXPENSE', isActive: true }).lean();
    const wallets = await Wallet.find({ isActive: true }).lean();
    const vendors = await Vendor.find({}).lean();

    return (
        <RecurringClient
            initialData={JSON.parse(JSON.stringify(recurringExpenses))}
            categories={JSON.parse(JSON.stringify(categories))}
            wallets={JSON.parse(JSON.stringify(wallets))}
            vendors={JSON.parse(JSON.stringify(vendors))}
        />
    );
}
