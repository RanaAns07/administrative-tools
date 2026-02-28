import { Layers, GraduationCap, Clock, Award } from 'lucide-react';

export default function SemestersPage() {
    return (
        <div className="max-w-[1100px] mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Semesters Overview</h1>
                <p className="text-sm text-gray-500 mt-1">
                    Information context regarding how semester progression functions across academic programs.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm relative overflow-hidden">
                    <div className="bg-blue-50/50 absolute top-0 right-0 p-8 rounded-bl-[100px] -mr-4 -mt-4" />
                    <Layers className="text-leads-blue mb-4 relative z-10" size={32} />
                    <h2 className="text-lg font-bold text-gray-900 mb-2 relative z-10">Intrinsic Structuring</h2>
                    <p className="text-sm text-gray-600 leading-relaxed mb-4 relative z-10">
                        In Khatta Engine, "Semesters" are intrinsic numeric properties of a <strong className="text-gray-900">Program</strong> and the <strong className="text-gray-900">StudentProfile</strong>.
                        We do not assign models to individual semesters themselves. Instead, semesters represent the chronological progress of a student through their enrolled program.
                    </p>
                    <ul className="text-sm text-gray-600 space-y-2 relative z-10">
                        <li className="flex gap-2 items-start">
                            <GraduationCap size={16} className="text-leads-blue mt-0.5 shrink-0" />
                            <span><strong>Programs</strong> define max `totalSemesters` (e.g., 8 for BSCS).</span>
                        </li>
                        <li className="flex gap-2 items-start">
                            <Clock size={16} className="text-leads-blue mt-0.5 shrink-0" />
                            <span><strong>Students</strong> maintain a `currentSemester` counter (1-based).</span>
                        </li>
                        <li className="flex gap-2 items-start">
                            <Award size={16} className="text-leads-blue mt-0.5 shrink-0" />
                            <span><strong>Fee Structures</strong> link charges conditionally against this counter.</span>
                        </li>
                    </ul>
                </div>

                <div className="bg-gradient-to-br from-leads-blue to-blue-900 rounded-2xl p-6 text-white shadow-sm flex flex-col justify-center">
                    <h2 className="text-xl font-bold mb-2">Automated Semester Promotions</h2>
                    <p className="text-sm text-blue-100 leading-relaxed mb-6">
                        When an ongoing Academic Session concludes, batch processing scripts automatically increment the `currentSemester` for all enrolled and ACTIVE `StudentProfiles` linked to `Batches` under that session, stopping when they hit the program's `totalSemesters`.
                    </p>
                    <div className="bg-white/10 p-4 rounded-xl border border-white/20">
                        <p className="font-mono text-xs opacity-80 mb-1">To view current active sessions driving semester promotions:</p>
                        <a href="/finance/academic/sessions" className="text-white hover:underline text-sm font-semibold flex items-center gap-1">
                            Go to Academic Sessions &rarr;
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
}
