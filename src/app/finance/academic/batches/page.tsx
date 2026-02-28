import dbConnect from '@/lib/mongodb';
import Batch from '@/models/university/Batch';
import Program from '@/models/university/Program';
import BatchesManager from './BatchesManager';

export const dynamic = 'force-dynamic';

export default async function BatchesPage() {
    await dbConnect();

    const rawBatches = await Batch.find()
        .populate('programId', 'name code')
        .sort({ year: -1, season: 1 })
        .lean();

    const rawPrograms = await Program.find({ isActive: true }).sort({ name: 1 }).lean();

    return (
        <div className="max-w-[1100px] mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Batches</h1>
                <p className="text-sm text-gray-500 mt-1">
                    Student batch registry grouped by program, year, and season. Batches serve as the backbone for calculating fee structures.
                </p>
            </div>

            <BatchesManager
                initialBatches={JSON.parse(JSON.stringify(rawBatches))}
                programs={JSON.parse(JSON.stringify(rawPrograms))}
            />
        </div>
    );
}
