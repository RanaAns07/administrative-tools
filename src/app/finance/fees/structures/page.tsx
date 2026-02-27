import dbConnect from '@/lib/mongodb';
import FeeStructure from '@/models/finance/FeeStructure';
import Batch from '@/models/university/Batch';
import '@/models/university/Program'; // Ensure Program model is registered for populate
import FeeStructureManager from './FeeStructureManager';

export const dynamic = 'force-dynamic';

export default async function FeeStructuresPage() {
    await dbConnect();

    // Fetch previously created active structures
    const rawStructures = await FeeStructure.find({ isActive: true })
        .populate({
            path: 'batchId',
            select: 'year season',
            populate: { path: 'programId', select: 'name code' }
        })
        .sort({ createdAt: -1 })
        .lean();

    // Fetch active batches for the creation dropdown
    const rawBatches = await Batch.find({ isActive: true })
        .populate('programId', 'name code')
        .sort({ year: -1, season: 1 })
        .lean();

    return (
        <FeeStructureManager
            initialStructures={JSON.parse(JSON.stringify(rawStructures))}
            batches={JSON.parse(JSON.stringify(rawBatches))}
        />
    );
}
