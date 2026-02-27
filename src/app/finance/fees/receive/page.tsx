import dbConnect from '@/lib/mongodb';
import Wallet from '@/models/finance/Wallet';
import Category from '@/models/finance/Category';
import FeeReceiveForm from './FeeReceiveForm';

export default async function FeeReceivePage() {
    await dbConnect();

    // Fetch active wallets and income categories for the payment form
    const wallets = await Wallet.find({ isActive: true }).sort({ name: 1 }).lean();
    const categories = await Category.find({ type: 'INCOME', isActive: true }).sort({ name: 1 }).lean();

    return (
        <FeeReceiveForm
            wallets={JSON.parse(JSON.stringify(wallets))}
            categories={JSON.parse(JSON.stringify(categories))}
        />
    );
}
