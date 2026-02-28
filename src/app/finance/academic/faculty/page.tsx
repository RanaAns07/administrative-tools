import dbConnect from '@/lib/mongodb';
import Employee from '@/models/finance/Employee';
import Department from '@/models/university/Department';
import FacultyManager from './FacultyManager';

export const dynamic = 'force-dynamic';

export default async function FacultyPage() {
    await dbConnect();

    // Fetch employees who are recognized as faculty essentially by their designation, 
    // or we can just fetch all employees and allow user to filter.
    // For this module, we will assume those belonging to academic departments are faculty.
    // However, best approach is bringing in designations like Professor, Lecturer etc.
    const academicDesignations = ["Professor", "Associate Professor", "Assistant Professor", "Lecturer", "Adjunct Faculty", "Teaching Assistant"];

    const rawFaculty = await Employee.find({ designation: { $in: academicDesignations } })
        .sort({ joiningDate: -1 })
        .lean();

    const rawDepartments = await Department.find({ isActive: true }).sort({ name: 1 }).lean();

    return (
        <div className="max-w-[1200px] mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Academic Faculty</h1>
                <p className="text-sm text-gray-500 mt-1">
                    Manage academic faculty members — their departments, qualifications, and associations with HR & Payroll.
                </p>
            </div>

            <FacultyManager
                initialFaculty={JSON.parse(JSON.stringify(rawFaculty))}
                departments={JSON.parse(JSON.stringify(rawDepartments))}
            />
        </div>
    );
}
