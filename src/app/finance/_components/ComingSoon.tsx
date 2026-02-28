import {
    ShieldCheck, LockKeyhole, Settings, BarChart3, FileSpreadsheet,
    Receipt, Users, TrendingDown, Calendar, BookOpen, Building2, Layers,
    Briefcase, ArrowRightLeft, FileText, RefreshCw
} from 'lucide-react';

const ICON_MAP: Record<string, React.ElementType> = {
    ShieldCheck, LockKeyhole, Settings, BarChart3, FileSpreadsheet,
    Receipt, Users, TrendingDown, Calendar, BookOpen, Building2, Layers,
    Briefcase, ArrowRightLeft, FileText, RefreshCw,
};

export default function ComingSoon({
    title, description, icon = 'BarChart3'
}: {
    title: string;
    description?: string;
    icon?: string;
}) {
    const Icon = ICON_MAP[icon] || BarChart3;

    return (
        <div className="max-w-[700px] mx-auto py-20">
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-12 flex flex-col items-center text-center gap-5">
                <div className="p-5 bg-leads-blue/5 rounded-2xl">
                    <Icon className="text-leads-blue" size={36} />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{title}</h1>
                    {description && <p className="text-gray-500 mt-2 text-sm leading-relaxed max-w-sm mx-auto">{description}</p>}
                </div>
                <div className="inline-flex items-center gap-2 bg-amber-50 border border-amber-100 text-amber-700 px-4 py-2 rounded-full text-xs font-semibold">
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                    Under Construction
                </div>
            </div>
        </div>
    );
}
