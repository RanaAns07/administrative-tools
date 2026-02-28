import dbConnect from '@/lib/mongodb';
import Program from '@/models/university/Program';
import ProgramsManager from './ProgramsManager';

export const dynamic = 'force-dynamic';

export default async function ProgramsPage() {
    await dbConnect();

    // Fetch programs
    const rawPrograms = await Program.find({})
        .sort({ name: 1 })
        .lean();

    return (
        <ProgramsManager initialPrograms={JSON.parse(JSON.stringify(rawPrograms))} />
    );
}
