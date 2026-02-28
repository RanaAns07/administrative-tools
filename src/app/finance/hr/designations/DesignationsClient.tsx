'use client';

import { Building2, Briefcase, Info } from 'lucide-react';

export default function DesignationsClient({
    uniqueDepartments,
    uniqueRoles
}: {
    uniqueDepartments: string[],
    uniqueRoles: string[]
}) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Departments */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
                <div className="p-5 border-b border-gray-100 bg-gray-50 flexitems-center gap-3">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-100 text-indigo-700 rounded-lg">
                            <Building2 size={20} />
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-900">Departments</h3>
                            <p className="text-xs text-gray-500">Active departments based on staff records</p>
                        </div>
                    </div>
                </div>
                <div className="p-6 flex-1 bg-white">
                    {uniqueDepartments.length === 0 ? (
                        <div className="flex items-center gap-2 text-sm text-gray-400 justify-center h-full">
                            <Info size={16} /> No departments defined yet.
                        </div>
                    ) : (
                        <ul className="space-y-3">
                            {uniqueDepartments.map((dept, idx) => (
                                <li key={idx} className="flex items-center justify-between px-4 py-3 bg-gray-50 rounded-lg border border-gray-100">
                                    <span className="font-medium text-gray-800">{dept}</span>
                                    <span className="text-xs font-semibold px-2 py-1 bg-indigo-50 text-indigo-600 rounded">Active</span>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
                <div className="p-4 border-t border-gray-100 bg-gray-50 text-xs text-gray-500 flex items-center gap-2">
                    <Info size={14} /> Departments are automatically discovered when creating Staff.
                </div>
            </div>

            {/* Roles */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
                <div className="p-5 border-b border-gray-100 bg-gray-50 flexitems-center gap-3">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg">
                            <Briefcase size={20} />
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-900">Designations / Roles</h3>
                            <p className="text-xs text-gray-500">Active roles based on staff records</p>
                        </div>
                    </div>
                </div>
                <div className="p-6 flex-1 bg-white">
                    {uniqueRoles.length === 0 ? (
                        <div className="flex items-center gap-2 text-sm text-gray-400 justify-center h-full">
                            <Info size={16} /> No roles defined yet.
                        </div>
                    ) : (
                        <ul className="space-y-3">
                            {uniqueRoles.map((role, idx) => (
                                <li key={idx} className="flex items-center justify-between px-4 py-3 bg-gray-50 rounded-lg border border-gray-100">
                                    <span className="font-medium text-gray-800">{role}</span>
                                    <span className="text-xs font-semibold px-2 py-1 bg-emerald-50 text-emerald-600 rounded">Active</span>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
                <div className="p-4 border-t border-gray-100 bg-gray-50 text-xs text-gray-500 flex items-center gap-2">
                    <Info size={14} /> Roles are automatically discovered when creating Staff.
                </div>
            </div>
        </div>
    );
}
