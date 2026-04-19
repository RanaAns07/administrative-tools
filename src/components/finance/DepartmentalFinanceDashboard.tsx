'use client';

import React, { useState, useMemo } from 'react';
import { 
  ArrowUpRight, 
  ArrowDownRight, 
  TrendingUp, 
  DollarSign, 
  Users, 
  AlertTriangle,
  ChevronUp,
  ChevronDown,
  Search,
  Download
} from 'lucide-react';
import * as XLSX from 'xlsx';

interface DepartmentFinanceData {
  _id: string; // departmentId
  departmentName: string;
  expectedRevenue: number;
  actualCollected: number;
  pendingReceivables: number;
  totalFinesCollected: number;
}

interface DepartmentalFinanceDashboardProps {
  data: DepartmentFinanceData[];
}

/**
 * DepartmentalFinanceDashboard Component
 * Provides a high-level overview of departmental financial health.
 * Features KPI cards and a sortable data table with conditional formatting for alerts.
 */
export default function DepartmentalFinanceDashboard({ data }: DepartmentalFinanceDashboardProps) {
  const [sortConfig, setSortConfig] = useState<{ key: keyof DepartmentFinanceData; direction: 'asc' | 'desc' } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Calculate Global KPIs
  const kpis = useMemo(() => {
    const totalExpected = data.reduce((sum, d) => sum + d.expectedRevenue, 0);
    const totalEarned = data.reduce((sum, d) => sum + d.actualCollected, 0);
    const totalFines = data.reduce((sum, d) => sum + d.totalFinesCollected, 0);
    const collectionRate = totalExpected > 0 ? (totalEarned / totalExpected) * 100 : 0;

    return { totalExpected, totalEarned, totalFines, collectionRate };
  }, [data]);

  // Sort and Filter Logic
  const processedData = useMemo(() => {
    let filtered = data.filter(d => 
      d.departmentName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (sortConfig !== null) {
      filtered.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }

    return filtered;
  }, [data, sortConfig, searchTerm]);

  const requestSort = (key: keyof DepartmentFinanceData) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key: keyof DepartmentFinanceData) => {
    if (sortConfig?.key !== key) return <div className="w-4 h-4 opacity-0 group-hover:opacity-30"><ChevronUp className="w-4 h-4" /></div>;
    return sortConfig.direction === 'asc' ? <ChevronUp className="w-4 h-4 text-blue-600" /> : <ChevronDown className="w-4 h-4 text-blue-600" />;
  };

  const exportToExcel = () => {
    const reportData = processedData.map(d => ({
      'Department': d.departmentName,
      'Expected Revenue': d.expectedRevenue,
      'Actual Collected': d.actualCollected,
      'Pending Receivables': d.pendingReceivables,
      'Total Fines Collected': d.totalFinesCollected
    }));

    const ws = XLSX.utils.json_to_sheet(reportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Finance Report");
    
    const date = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `University_Finance_Report_${date}.xlsx`);
  };

  return (
    <div className="space-y-8 p-6 bg-gray-50/50 min-h-screen">
      {/* KPI Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard 
          title="Total Expected" 
          value={`$${kpis.totalExpected.toLocaleString()}`} 
          icon={<DollarSign className="w-6 h-6 text-blue-600" />}
          trend={`${kpis.collectionRate.toFixed(1)}% Projected`}
          trendUp={true}
        />
        <KPICard 
          title="Actual Collected" 
          value={`$${kpis.totalEarned.toLocaleString()}`} 
          icon={<TrendingUp className="w-6 h-6 text-emerald-600" />}
          trend="Real-time Revenue"
          trendUp={true}
          color="emerald"
        />
        <KPICard 
          title="Outstanding Arrears" 
          value={`$${(kpis.totalExpected - kpis.totalEarned).toLocaleString()}`} 
          icon={<Users className="w-6 h-6 text-amber-600" />}
          trend="Action Required"
          trendUp={false}
          color="amber"
        />
        <KPICard 
          title="Total Fines" 
          value={`$${kpis.totalFines.toLocaleString()}`} 
          icon={<AlertTriangle className="w-6 h-6 text-purple-600" />}
          trend="Penalty Income"
          trendUp={true}
          color="purple"
        />
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-8 py-6 border-b border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <h3 className="text-xl font-bold text-gray-800 tracking-tight">Departmental Breakdown</h3>
          <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
            <div className="relative w-full md:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search departments..."
                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button
              onClick={exportToExcel}
              className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-lg shadow-green-100 transition-all active:scale-95"
            >
              <Download className="w-4 h-4" />
              Export to Excel
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50">
                <TableHeader label="Department" onClick={() => requestSort('departmentName')} icon={getSortIcon('departmentName')} />
                <TableHeader label="Expected Rev." onClick={() => requestSort('expectedRevenue')} icon={getSortIcon('expectedRevenue')} align="right" />
                <TableHeader label="Collected" onClick={() => requestSort('actualCollected')} icon={getSortIcon('actualCollected')} align="right" />
                <TableHeader label="Pending" onClick={() => requestSort('pendingReceivables')} icon={getSortIcon('pendingReceivables')} align="right" />
                <TableHeader label="Fines" onClick={() => requestSort('totalFinesCollected')} icon={getSortIcon('totalFinesCollected')} align="right" />
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {processedData.map((dept) => {
                const fineRatio = dept.totalFinesCollected / (dept.actualCollected || 1);
                const isHighRisk = fineRatio > 0.05 || dept.pendingReceivables > dept.expectedRevenue * 0.3;

                return (
                  <tr key={dept._id} className="hover:bg-blue-50/30 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="font-bold text-gray-800">{dept.departmentName}</div>
                      <div className="text-[10px] text-gray-400 font-mono">{dept._id}</div>
                    </td>
                    <td className="px-6 py-4 text-right font-semibold text-gray-600">
                      ${dept.expectedRevenue.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="font-bold text-emerald-600">${dept.actualCollected.toLocaleString()}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="font-bold text-amber-600">${dept.pendingReceivables.toLocaleString()}</span>
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-purple-600">
                      ${dept.totalFinesCollected.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {isHighRisk ? (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-black bg-red-100 text-red-600 animate-pulse uppercase tracking-tighter">
                          High Outstanding
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-600 uppercase tracking-tighter">
                          Healthy
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// Internal Helper Components
function KPICard({ title, value, icon, trend, trendUp, color = 'blue' }: any) {
  const colors: any = {
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    amber: 'bg-amber-50 text-amber-600 border-amber-100',
    purple: 'bg-purple-50 text-purple-600 border-purple-100',
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start">
        <div className={`p-3 rounded-xl border ${colors[color]}`}>
          {icon}
        </div>
        <div className={`flex items-center gap-1 text-xs font-bold ${trendUp ? 'text-emerald-600' : 'text-amber-600'}`}>
          {trendUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
          {trend}
        </div>
      </div>
      <div className="mt-6">
        <h4 className="text-sm font-bold text-gray-400 uppercase tracking-widest">{title}</h4>
        <p className="text-3xl font-black text-gray-900 mt-1">{value}</p>
      </div>
    </div>
  );
}

function TableHeader({ label, onClick, icon, align = 'left' }: any) {
  return (
    <th 
      className={`px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest cursor-pointer group hover:text-blue-600 transition-colors ${align === 'right' ? 'text-right' : 'text-left'}`}
      onClick={onClick}
    >
      <div className={`flex items-center gap-2 ${align === 'right' ? 'justify-end' : ''}`}>
        {label}
        {icon}
      </div>
    </th>
  );
}
