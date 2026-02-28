'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard, Users, BookOpen, Calculator,
    CreditCard, Calendar, GraduationCap, FileText,
    TrendingDown, Building2, Wallet, ClipboardList, UserCheck,
    ChevronDown, ChevronRight, Menu, X, LogOut,
    ShieldCheck, ArrowRightLeft, Tag, Layers,
    Briefcase, Banknote, RefreshCw, BarChart3, Settings,
    FileSpreadsheet, Receipt, LineChart, BadgeDollarSign, LockKeyhole
} from 'lucide-react';
import { signOut } from 'next-auth/react';
import RoleGuard from './_components/RoleGuard';

interface NavItem {
    label: string;
    href: string;
    icon: React.ElementType;
}

interface NavGroup {
    title: string;
    items: NavItem[];
}

const navConfig: NavGroup[] = [
    {
        title: 'ACADEMIC',
        items: [
            { label: 'Faculty', href: '/finance/academic/faculty', icon: Users },
            { label: 'Departments', href: '/finance/academic/departments', icon: Building2 },
            { label: 'Programs', href: '/finance/academic/programs', icon: BookOpen },
            { label: 'Academic Sessions', href: '/finance/academic/sessions', icon: Calendar },
            { label: 'Semesters', href: '/finance/academic/semesters', icon: Layers },
            { label: 'Batches', href: '/finance/academic/batches', icon: Users },
            { label: 'Students', href: '/finance/academic/students', icon: Users },
        ],
    },
    {
        title: 'FEE MANAGEMENT',
        items: [
            { label: 'Fee Structures', href: '/finance/fees/structures', icon: ClipboardList },
            { label: 'Scholarships', href: '/finance/fees/scholarships', icon: GraduationCap },
            { label: 'Students', href: '/finance/fees/students', icon: Users },
            { label: 'Invoices', href: '/finance/fees/invoices', icon: FileText },
            { label: 'Payments', href: '/finance/fees/payments', icon: CreditCard },
            { label: 'Refunds', href: '/finance/fees/refunds', icon: RefreshCw },
            { label: 'Advance Balances', href: '/finance/fees/advances', icon: Banknote },
            { label: 'Fee Reports', href: '/finance/fees/reports', icon: BarChart3 },
        ],
    },
    {
        title: 'HR & PAYROLL',
        items: [
            { label: 'Employees', href: '/finance/hr/employees', icon: Users },
            { label: 'Designations', href: '/finance/hr/designations', icon: Briefcase },
            { label: 'Salary Structures', href: '/finance/hr/structures', icon: Calculator },
            { label: 'Payroll', href: '/finance/hr/payroll', icon: UserCheck },
            { label: 'Payslips', href: '/finance/hr/payslips', icon: FileText },
            { label: 'Loans & Advances', href: '/finance/hr/loans', icon: ArrowRightLeft },
        ],
    },
    {
        title: 'EXPENSES',
        items: [
            { label: 'Expense Categories', href: '/finance/expenses/categories', icon: Tag },
            { label: 'Vendors', href: '/finance/expenses/vendors', icon: Users },
            { label: 'Expenses', href: '/finance/expenses', icon: TrendingDown },
            { label: 'Recurring Expenses', href: '/finance/expenses/recurring', icon: RefreshCw },
            { label: 'Expense Reports', href: '/finance/reports/expense', icon: BarChart3 },
        ],
    },
    {
        title: 'CASH & BANK',
        items: [
            { label: 'Wallets', href: '/finance/cash/wallets', icon: Wallet },
            { label: 'Transfers', href: '/finance/cash/transfers', icon: ArrowRightLeft },
            { label: 'Reconciliation', href: '/finance/cash/reconciliation', icon: ShieldCheck },
            { label: 'Daily Closing', href: '/finance/cash/closing', icon: LockKeyhole },
        ],
    },
    {
        title: 'INVESTMENTS',
        items: [
            { label: 'Investments', href: '/finance/investments', icon: TrendingDown }, // actually trending up makes more sense for investment but let's use linechart
            { label: 'Returns', href: '/finance/investments/returns', icon: BadgeDollarSign },
            { label: 'Maturity Tracking', href: '/finance/investments/maturity', icon: Calendar },
        ],
    },
    {
        title: 'REPORTS',
        items: [
            { label: 'Revenue', href: '/finance/reports/revenue', icon: TrendingDown },
            { label: 'Expense', href: '/finance/reports/expense', icon: TrendingDown },
            { label: 'Dues', href: '/finance/reports/dues', icon: FileSpreadsheet },
            { label: 'Salary Summary', href: '/finance/reports/salary', icon: Users },
            { label: 'Surplus / Deficit', href: '/finance/reports/surplus', icon: Receipt },
        ],
    },
    {
        title: 'SYSTEM',
        items: [
            { label: 'Users & Roles', href: '/finance/system/roles', icon: ShieldCheck },
            { label: 'Month Locking', href: '/finance/system/locking', icon: LockKeyhole },
            { label: 'Audit Logs', href: '/finance/audit-log', icon: FileText },
            { label: 'Settings', href: '/finance/system/settings', icon: Settings },
        ],
    },
];

// Adjust some icons
navConfig.find(g => g.title === 'INVESTMENTS')!.items[0].icon = LineChart;
navConfig.find(g => g.title === 'REPORTS')!.items[0].icon = LineChart;

function NavGroupSection({ group, pathname }: { group: NavGroup; pathname: string }) {
    const isChildActive = group.items.some((c) => pathname.startsWith(c.href));
    const [open, setOpen] = useState(isChildActive || false);

    return (
        <div className="mb-2">
            <button
                onClick={() => setOpen(!open)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors hover:bg-gray-100 ${open ? 'text-gray-900' : 'text-gray-500'
                    }`}
            >
                <span>{group.title}</span>
                {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
            {open && (
                <div className="mt-1 space-y-0.5">
                    {group.items.map((item) => {
                        const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                        return (
                            <RoleGuard key={item.label}>
                                <Link
                                    href={item.href}
                                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${isActive
                                        ? 'bg-leads-blue/10 text-leads-blue font-semibold shadow-sm'
                                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                                        }`}
                                >
                                    <item.icon size={16} />
                                    <span>{item.label}</span>
                                </Link>
                            </RoleGuard>
                        );
                    })}
                </div>
            )}
        </div>
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
                        <LayoutDashboard className="text-white" size={20} />
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

                {/* Dashboard Main Link */}
                <div className="px-3 py-3 border-b border-gray-100">
                    <RoleGuard>
                        <Link
                            href="/finance"
                            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${pathname === '/finance'
                                ? 'bg-leads-blue text-white font-semibold shadow-sm'
                                : 'text-gray-700 hover:bg-gray-100 font-semibold'
                                }`}
                        >
                            <LayoutDashboard size={16} />
                            <span>Executive Dashboard</span>
                        </Link>
                    </RoleGuard>
                </div>

                {/* Navigation Groups */}
                <nav className="flex-1 overflow-y-auto px-3 py-4">
                    {navConfig.map((group) => (
                        <NavGroupSection key={group.title} group={group} pathname={pathname} />
                    ))}
                </nav>

                {/* Sidebar Footer */}
                <div className="border-t border-gray-100 p-3 space-y-1 bg-gray-50/50">
                    <Link
                        href="/"
                        className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs text-leads-blue font-medium hover:bg-blue-50 transition-colors"
                    >
                        <LockKeyhole size={14} />
                        <span>Go to Main Portal</span>
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
                            <p className="text-[10px] text-gray-400 uppercase tracking-wider">Enterprise Finance System</p>
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
