'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    Landmark, LayoutDashboard, FileText, Users,
    TrendingDown, Building2, Wallet, ClipboardList, UserCheck,
    ChevronDown, ChevronRight, Menu, X, LogOut,
    ShieldCheck, ArrowRightLeft, GraduationCap, Tag,
} from 'lucide-react';
import { signOut } from 'next-auth/react';

interface NavItem {
    label: string;
    href?: string;
    icon: React.ElementType;
    children?: NavItem[];
}

const navItems: NavItem[] = [
    { label: 'Dashboard', href: '/finance', icon: LayoutDashboard },
    { label: 'Wallets', href: '/finance/wallets', icon: Wallet },
    { label: 'Transactions', href: '/finance/transactions', icon: ArrowRightLeft },
    { label: 'Expenses', href: '/finance/expenses', icon: TrendingDown },
    { label: 'Payroll', href: '/finance/payroll', icon: UserCheck },
    {
        label: 'Fees',
        icon: GraduationCap,
        children: [
            { label: 'Structures', href: '/finance/fees/structures', icon: ClipboardList },
            { label: 'Invoices', href: '/finance/fees/invoices', icon: FileText },
            { label: 'Receive', href: '/finance/fees/receive', icon: Wallet },
        ],
    },
    {
        label: 'University',
        icon: Building2,
        children: [
            { label: 'Programs', href: '/finance/university/programs', icon: GraduationCap },
            { label: 'Students', href: '/finance/university/students', icon: Users },
        ],
    },
    { label: 'Staff', href: '/finance/staff', icon: Users },
    { label: 'Categories', href: '/finance/categories', icon: Tag },
    { label: 'Audit Log', href: '/finance/audit-log', icon: ShieldCheck },
];

function NavSection({ item, pathname, level = 0 }: { item: NavItem; pathname: string; level?: number }) {
    const isActive = item.href ? pathname === item.href : false;
    const isChildActive = item.children?.some((c) => c.href && pathname.startsWith(c.href));
    const [open, setOpen] = useState(isChildActive || false);

    if (item.children) {
        return (
            <div>
                <button
                    onClick={() => setOpen(!open)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
            ${isChildActive ? 'bg-leads-blue/10 text-leads-blue' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`}
                >
                    <div className="flex items-center gap-3">
                        <item.icon size={17} />
                        <span>{item.label}</span>
                    </div>
                    {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </button>
                {open && (
                    <div className="ml-4 mt-1 space-y-0.5 border-l-2 border-gray-100 pl-3">
                        {item.children.map((child) => (
                            <NavSection key={child.label} item={child} pathname={pathname} level={level + 1} />
                        ))}
                    </div>
                )}
            </div>
        );
    }

    return (
        <Link
            href={item.href!}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors
        ${isActive
                    ? 'bg-leads-blue text-white font-semibold shadow-sm'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
        >
            <item.icon size={16} />
            <span>{item.label}</span>
        </Link>
    );
}

export default function FinanceLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const [sidebarOpen, setSidebarOpen] = useState(false);

    return (
        <div className="min-h-screen flex bg-gray-50">
            {/* Mobile overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 z-20 bg-black/40 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`fixed top-0 left-0 h-full w-64 bg-white border-r border-gray-200 z-30 flex flex-col transition-transform duration-300
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 lg:static lg:z-auto`}
            >
                {/* Sidebar Header */}
                <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-100">
                    <div className="p-2 bg-leads-blue rounded-lg">
                        <Landmark className="text-white" size={20} />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-leads-blue leading-tight">Finance</p>
                        <p className="text-[10px] text-gray-400 uppercase tracking-wider">Department Portal</p>
                    </div>
                    <button
                        onClick={() => setSidebarOpen(false)}
                        className="ml-auto lg:hidden text-gray-400 hover:text-gray-600"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Navigation */}
                <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
                    {navItems.map((item) => (
                        <NavSection key={item.label} item={item} pathname={pathname} />
                    ))}
                </nav>

                {/* Sidebar Footer */}
                <div className="border-t border-gray-100 p-3 space-y-1">
                    <Link
                        href="/"
                        className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs text-leads-blue font-medium hover:bg-blue-50 transition-colors"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
                        </svg>
                        <span>Go to Portal</span>
                    </Link>
                    <button
                        onClick={() => signOut({ callbackUrl: '/login' })}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs text-red-600 hover:bg-red-50 transition-colors"
                    >
                        <LogOut size={15} />
                        <span>Sign Out</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-h-screen min-w-0">
                {/* Top bar */}
                <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-4 sticky top-0 z-10">
                    <button
                        onClick={() => setSidebarOpen(true)}
                        className="lg:hidden text-gray-500 hover:text-gray-700"
                    >
                        <Menu size={22} />
                    </button>
                    <div className="flex items-center gap-2">
                        <img src="/Logo.png" alt="LLU" className="h-8 w-8 object-contain" />
                        <div className="hidden sm:block">
                            <p className="text-sm font-bold text-leads-blue">Lahore Leads University</p>
                            <p className="text-[10px] text-gray-400 uppercase tracking-wider">Finance Department</p>
                        </div>
                    </div>
                    <div className="ml-auto flex items-center gap-2 text-xs text-gray-500">
                        <div className="h-2 w-2 bg-green-400 rounded-full animate-pulse" />
                        <span className="hidden sm:inline">System Online</span>
                    </div>
                </header>

                {/* Page content */}
                <main className="flex-1 p-4 sm:p-6 overflow-auto">
                    {children}
                </main>
            </div>
        </div>
    );
}
