import dbConnect from '@/lib/mongodb';
import Category from '@/models/finance/Category';
import CategoriesManager from './CategoriesManager';

export const dynamic = 'force-dynamic';

export default async function CategoriesPage() {
    await dbConnect();

    const rawCategories = await Category.find({})
        .sort({ type: 1, name: 1 })
        .lean();

    return (
        <CategoriesManager initialCategories={JSON.parse(JSON.stringify(rawCategories))} />
    );
}
