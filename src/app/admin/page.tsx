"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, LogOut, Check, X, Shield, Landmark, Users as UsersIcon, Briefcase, Pencil, Trash2 } from "lucide-react";
import Image from "next/image";
import { signOut } from "next-auth/react";
import Link from "next/link";

type Permissions = {
    finance: { hasAccess: boolean };
    admissions: { hasAccess: boolean };
    hr: { hasAccess: boolean };
};

type User = {
    _id: string;
    name: string;
    email: string;
    role: string;
    permissions: Permissions;
};

export default function AdminDashboard() {
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitLoading, setIsSubmitLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [editingUser, setEditingUser] = useState<User | null>(null);

    // Form State
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        password: "",
        role: "Staff",
        permissions: {
            finance: { hasAccess: false },
            admissions: { hasAccess: false },
            hr: { hasAccess: false },
        },
    });

    const fetchUsers = async () => {
        try {
            setIsLoading(true);
            setError(null);
            const res = await fetch('/api/admin/users');
            if (!res.ok) throw new Error('Failed to fetch users');
            const data = await res.json();
            setUsers(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleOpenModal = (user?: User) => {
        if (user) {
            setEditingUser(user);
            setFormData({
                name: user.name,
                email: user.email,
                password: "", // Make password optional during edit flow
                role: user.role,
                permissions: {
                    finance: user.permissions?.finance || { hasAccess: false },
                    admissions: user.permissions?.admissions || { hasAccess: false },
                    hr: user.permissions?.hr || { hasAccess: false },
                },
            });
        } else {
            setEditingUser(null);
            setFormData({
                name: "",
                email: "",
                password: "",
                role: "Staff",
                permissions: {
                    finance: { hasAccess: false },
                    admissions: { hasAccess: false },
                    hr: { hasAccess: false },
                },
            });
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => setIsModalOpen(false);

    const handlePermissionToggle = (module: keyof Permissions) => {
        setFormData((prev) => ({
            ...prev,
            permissions: {
                ...prev.permissions,
                [module]: { hasAccess: !prev.permissions[module].hasAccess },
            },
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setIsSubmitLoading(true);
            setError(null);

            const endpoint = editingUser ? `/api/admin/users/${editingUser._id}` : '/api/admin/users';
            const method = editingUser ? 'PUT' : 'POST';

            const res = await fetch(endpoint, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || `Failed to ${editingUser ? 'update' : 'create'} user`);
            }

            await fetchUsers();
            handleCloseModal();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsSubmitLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm("Are you sure you want to delete this user?")) return;

        try {
            const res = await fetch(`/api/admin/users/${id}`, { method: 'DELETE' });
            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || 'Failed to delete user');
            }
            // Update local state for immediate UI feedback without hard refresh
            setUsers(users.filter(u => u._id !== id));
        } catch (err: any) {
            alert(err.message);
        }
    };

    return (
        <div className="min-h-screen bg-leads-gray flex flex-col font-sans">
            {/* Top Navigation Bar */}
            <header className="bg-white shadow-sm border-b border-gray-200 z-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <Image src="/Logo.jpeg" alt="Leads University Logo" width={50} height={50} className="object-contain" />
                        <div className="hidden sm:block">
                            <h1 className="text-xl font-bold text-leads-blue leading-tight">Lahore Leads University</h1>
                            <p className="text-xs text-leads-gold font-semibold uppercase tracking-wider">Administration Portal</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Link
                            href="/"
                            className="flex items-center gap-2 text-leads-blue border border-leads-blue text-sm font-medium px-3 py-2 rounded-md hover:bg-leads-blue hover:text-white transition-all duration-200"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
                            </svg>
                            <span className="hidden sm:inline">Go to Portal</span>
                        </Link>
                        <button
                            onClick={() => signOut({ callbackUrl: '/login' })}
                            className="flex items-center gap-2 text-gray-500 hover:text-leads-red transition-colors font-medium text-sm px-3 py-2 rounded-md hover:bg-gray-50"
                        >
                            <LogOut size={18} />
                            <span className="hidden sm:inline">Sign Out</span>
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content Area */}
            <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">

                {/* Header Section */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                    <div>
                        <h2 className="text-3xl font-bold text-leads-blue flex items-center gap-3">
                            <Shield className="text-leads-gold" size={32} />
                            User Management
                        </h2>
                        <p className="text-gray-500 mt-1">Manage system access, roles, and department permissions.</p>
                    </div>

                    <button
                        onClick={() => handleOpenModal()}
                        className="bg-leads-red hover:bg-red-800 text-white px-5 py-2.5 rounded-md font-semibold transition-colors flex items-center justify-center gap-2 shadow-sm"
                    >
                        <Plus size={20} />
                        Create User
                    </button>
                </div>

                {/* Quick Links */}
                <div className="flex flex-wrap gap-3 mb-6">
                    <Link
                        href="/admin/payment-approvals"
                        className="flex items-center gap-2 bg-yellow-50 border border-yellow-200 text-yellow-800 hover:bg-yellow-100 transition-colors rounded-lg px-4 py-2.5 text-sm font-semibold"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Payment Approvals
                    </Link>
                </div>

                {error && (
                    <div className="mb-6 bg-red-50 border-l-4 border-leads-red p-4 rounded-md flex justify-between items-start">
                        <div className="flex gap-3">
                            <X className="text-leads-red mt-0.5" size={20} />
                            <div>
                                <h3 className="text-red-800 font-medium">Error</h3>
                                <p className="text-red-700 text-sm mt-1">{error}</p>
                            </div>
                        </div>
                        <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">
                            <X size={16} />
                        </button>
                    </div>
                )}

                {/* Users Table */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-full">
                            <thead>
                                <tr className="bg-gray-50/80 border-b border-gray-100 text-xs uppercase tracking-wider text-gray-500 font-semibold">
                                    <th className="py-4 px-6 rounded-tl-xl">Name</th>
                                    <th className="py-4 px-6">Email</th>
                                    <th className="py-4 px-6">Role</th>
                                    <th className="py-4 px-6">Tool Access</th>
                                    <th className="py-4 px-6 text-right rounded-tr-xl">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {isLoading ? (
                                    <tr>
                                        <td colSpan={5} className="py-12 text-center text-gray-400">
                                            <div className="flex flex-col items-center justify-center">
                                                <div className="w-8 h-8 border-4 border-leads-blue border-t-transparent rounded-full animate-spin mb-4"></div>
                                                <p>Loading users...</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : users.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="py-12 text-center text-gray-500 bg-gray-50/30">
                                            No users found. Click &quot;Create User&quot; to add one.
                                        </td>
                                    </tr>
                                ) : (
                                    users.map((user, idx) => (
                                        <motion.tr
                                            key={user._id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: idx * 0.05 }}
                                            className="hover:bg-blue-50/30 transition-colors group"
                                        >
                                            <td className="py-4 px-6 font-medium text-gray-900">{user.name}</td>
                                            <td className="py-4 px-6 text-gray-500 text-sm">{user.email}</td>
                                            <td className="py-4 px-6">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border
                          ${user.role === 'SuperAdmin' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                                        user.role === 'Admin' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                                            'bg-gray-100 text-gray-700 border-gray-200'}`}
                                                >
                                                    {user.role}
                                                </span>
                                            </td>
                                            <td className="py-4 px-6">
                                                <div className="flex flex-wrap gap-1.5">
                                                    {user.permissions?.finance?.hasAccess && (
                                                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wide bg-blue-100 text-leads-blue border border-blue-200">
                                                            <Landmark size={10} /> Finance
                                                        </span>
                                                    )}
                                                    {user.permissions?.admissions?.hasAccess && (
                                                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wide bg-red-50 text-leads-red border border-red-200">
                                                            <UsersIcon size={10} /> Admissions
                                                        </span>
                                                    )}
                                                    {user.permissions?.hr?.hasAccess && (
                                                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wide bg-orange-50 text-orange-700 border border-orange-200">
                                                            <Briefcase size={10} /> HR
                                                        </span>
                                                    )}
                                                    {!user.permissions?.finance?.hasAccess && !user.permissions?.admissions?.hasAccess && !user.permissions?.hr?.hasAccess && (
                                                        <span className="text-gray-400 text-xs italic">None</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="py-4 px-6 text-right">
                                                <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={() => handleOpenModal(user)}
                                                        className="text-blue-600 hover:text-blue-800 transition-colors p-1"
                                                        title="Edit User"
                                                    >
                                                        <Pencil size={18} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(user._id)}
                                                        className="text-red-600 hover:text-red-800 transition-colors p-1"
                                                        title="Delete User"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </div>
                                            </td>
                                        </motion.tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>

            {/* Create User Modal */}
            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
                        <motion.div
                            className="absolute inset-0 bg-leads-blue/40 backdrop-blur-sm"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={handleCloseModal}
                        />

                        <motion.div
                            className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-full"
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        >
                            <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-gray-50/50">
                                <h3 className="text-xl font-bold text-leads-blue">
                                    {editingUser ? "Edit User" : "Create New User"}
                                </h3>
                                <button
                                    onClick={handleCloseModal}
                                    className="text-gray-400 hover:text-gray-600 transition-colors bg-white rounded-full p-1 shadow-sm border border-gray-100"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="overflow-y-auto p-6">
                                <form id="createUserForm" onSubmit={handleSubmit} className="space-y-4">
                                    <div className="grid grid-cols-1 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                                            <input
                                                type="text" required
                                                value={formData.name}
                                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                                className="w-full px-3 py-2 text-gray-900 bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-leads-blue focus:ring-1 focus:ring-leads-blue transition-shadow"
                                                placeholder="John Doe"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                                            <input
                                                type="email" required
                                                value={formData.email}
                                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                                className="w-full px-3 py-2 text-gray-900 bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-leads-blue focus:ring-1 focus:ring-leads-blue transition-shadow"
                                                placeholder="john@leads.edu.pk"
                                            />
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                                                <input
                                                    type="password" required={!editingUser} minLength={6}
                                                    value={formData.password}
                                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                                    className="w-full px-3 py-2 text-gray-900 bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-leads-blue focus:ring-1 focus:ring-leads-blue transition-shadow"
                                                    placeholder={editingUser ? "Leave blank to keep current password" : "••••••••"}
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">System Role</label>
                                                <select
                                                    value={formData.role}
                                                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                                    className="w-full px-3 py-2 text-gray-900 bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-leads-blue focus:ring-1 focus:ring-leads-blue transition-shadow"
                                                >
                                                    <option value="Staff">Staff</option>
                                                    <option value="Admin">Admin</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Permissions Section */}
                                    <div className="mt-6 pt-5 border-t-2 border-leads-gold">
                                        <h4 className="text-sm font-bold tracking-wider text-gray-800 uppercase mb-4 flex items-center gap-2">
                                            <Shield size={16} className="text-leads-gold" />
                                            Tool Access Permissions
                                        </h4>

                                        <div className="space-y-3 bg-gray-50 rounded-xl p-4 border border-gray-100">
                                            {/* Finance Toggle */}
                                            <label className="flex items-center justify-between cursor-pointer group p-2 hover:bg-white rounded-lg transition-colors">
                                                <div className="flex items-center gap-3">
                                                    <div className={`p-2 rounded-md ${formData.permissions.finance.hasAccess ? 'bg-blue-100 text-leads-blue' : 'bg-gray-200 text-gray-500'}`}>
                                                        <Landmark size={18} />
                                                    </div>
                                                    <div>
                                                        <span className="text-sm font-semibold text-gray-900 block relative">Finance Department</span>
                                                        <span className="text-xs text-gray-500">Access to ledgers and fees</span>
                                                    </div>
                                                </div>
                                                <div className="relative">
                                                    <input
                                                        type="checkbox" className="sr-only"
                                                        checked={formData.permissions.finance.hasAccess}
                                                        onChange={() => handlePermissionToggle('finance')}
                                                    />
                                                    <div className={`block w-10 h-6 rounded-full transition-colors ${formData.permissions.finance.hasAccess ? 'bg-leads-gold' : 'bg-gray-300'}`}></div>
                                                    <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${formData.permissions.finance.hasAccess ? 'translate-x-4' : ''}`}></div>
                                                </div>
                                            </label>

                                            {/* Admissions Toggle */}
                                            <label className="flex items-center justify-between cursor-pointer group p-2 hover:bg-white rounded-lg transition-colors">
                                                <div className="flex items-center gap-3">
                                                    <div className={`p-2 rounded-md ${formData.permissions.admissions.hasAccess ? 'bg-red-100 text-leads-red' : 'bg-gray-200 text-gray-500'}`}>
                                                        <UsersIcon size={18} />
                                                    </div>
                                                    <div>
                                                        <span className="text-sm font-semibold text-gray-900 block">Admissions Department</span>
                                                        <span className="text-xs text-gray-500">Access to student applications</span>
                                                    </div>
                                                </div>
                                                <div className="relative">
                                                    <input
                                                        type="checkbox" className="sr-only"
                                                        checked={formData.permissions.admissions.hasAccess}
                                                        onChange={() => handlePermissionToggle('admissions')}
                                                    />
                                                    <div className={`block w-10 h-6 rounded-full transition-colors ${formData.permissions.admissions.hasAccess ? 'bg-leads-gold' : 'bg-gray-300'}`}></div>
                                                    <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${formData.permissions.admissions.hasAccess ? 'translate-x-4' : ''}`}></div>
                                                </div>
                                            </label>

                                            {/* HR Toggle */}
                                            <label className="flex items-center justify-between cursor-pointer group p-2 hover:bg-white rounded-lg transition-colors">
                                                <div className="flex items-center gap-3">
                                                    <div className={`p-2 rounded-md ${formData.permissions.hr.hasAccess ? 'bg-orange-100 text-orange-600' : 'bg-gray-200 text-gray-500'}`}>
                                                        <Briefcase size={18} />
                                                    </div>
                                                    <div>
                                                        <span className="text-sm font-semibold text-gray-900 block">HR & Payroll</span>
                                                        <span className="text-xs text-gray-500">Access to employee records</span>
                                                    </div>
                                                </div>
                                                <div className="relative">
                                                    <input
                                                        type="checkbox" className="sr-only"
                                                        checked={formData.permissions.hr.hasAccess}
                                                        onChange={() => handlePermissionToggle('hr')}
                                                    />
                                                    <div className={`block w-10 h-6 rounded-full transition-colors ${formData.permissions.hr.hasAccess ? 'bg-leads-gold' : 'bg-gray-300'}`}></div>
                                                    <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${formData.permissions.hr.hasAccess ? 'translate-x-4' : ''}`}></div>
                                                </div>
                                            </label>
                                        </div>
                                    </div>
                                </form>
                            </div>

                            <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 rounded-b-2xl">
                                <button
                                    type="button"
                                    onClick={handleCloseModal}
                                    disabled={isSubmitLoading}
                                    className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    form="createUserForm"
                                    disabled={isSubmitLoading}
                                    className="px-6 py-2 bg-leads-red hover:bg-red-800 text-white rounded-lg font-medium transition-all shadow-md flex items-center gap-2 disabled:opacity-70"
                                >
                                    {isSubmitLoading ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                            Saving...
                                        </>
                                    ) : (
                                        <>
                                            <Check size={18} />
                                            Save User
                                        </>
                                    )}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
