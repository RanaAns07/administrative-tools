import dbConnect from '@/lib/mongodb';
import AcademicSession from '@/models/university/AcademicSession';
import SessionsManager from './SessionsManager';

export const dynamic = 'force-dynamic';

export default async function SessionsPage() {
    await dbConnect();

    const rawSessions = await AcademicSession.find()
        .sort({ startDate: -1 })
        .lean();

    return (
        <div className="max-w-[1100px] mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Academic Sessions</h1>
                <p className="text-sm text-gray-500 mt-1">
                    Define academic year sessions (e.g. Fall 2025). Sessions link fee structures to billing periods and determine standard operational cycles.
                </p>
            </div>

            <SessionsManager
                initialSessions={JSON.parse(JSON.stringify(rawSessions))}
            />
        </div>
    );
}
