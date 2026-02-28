import dbConnect from '@/lib/mongodb';
import StudentProfile from '@/models/university/StudentProfile';
import Batch from '@/models/university/Batch';
import '@/models/university/Program'; // ensure loaded
import StudentsManager from './StudentsManager';

export const dynamic = 'force-dynamic';

export default async function StudentsPage() {
    await dbConnect();

    // Fetch students
    const rawStudents = await StudentProfile.find({})
        .populate({
            path: 'batchId',
            select: 'year season',
            populate: { path: 'programId', select: 'name code' }
        })
        .sort({ registrationNumber: 1 })
        .limit(200) // cap for performance
        .lean();

    const rawBatches = await Batch.find({ isActive: true })
        .populate('programId', 'name code')
        .sort({ year: -1, season: 1 })
        .lean();

    return (
        <StudentsManager
            initialStudents={JSON.parse(JSON.stringify(rawStudents))}
            batches={JSON.parse(JSON.stringify(rawBatches))}
        />
    );
}
