import React, { useState } from 'react';
import { useStore } from '../../context/StoreContext';
import {
  History,
  ShieldAlert,
  Search,
  Filter,
  Download,
  CheckCircle,
  FileSpreadsheet,
} from 'lucide-react';

export const AdminAudit: React.FC = () => {
  const { auditLogs, language } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [moduleFilter, setModuleFilter] = useState('ALL');

  const filteredLogs = auditLogs.filter((log) => {
    const matchesSearch =
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.userName || log.user || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesModule = moduleFilter === 'ALL' || log.module === moduleFilter;
    return matchesSearch && matchesModule;
  });

  const exportAuditCsv = () => {
    const headers = ['Timestamp', 'User', 'Role', 'Module', 'Action', 'Details', 'IP Address'];
    const rows = filteredLogs.map((l) => [
      l.timestamp,
      l.userName,
      l.userRole,
      l.module,
      `"${l.action.replace(/"/g, '""')}"`,
      `"${l.details.replace(/"/g, '""')}"`,
      l.ipAddress || '127.0.0.1',
    ]);
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `udecs_audit_logs_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-6 sm:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#CBCFB9]">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black font-heading text-[#0F1913]">
            {language === 'bn'
              ? 'নিরাপত্তা ও অপরিবর্তনীয় সিস্টেম অডিট ট্রেইল'
              : 'Security & Immutable System Audit Trail Logs'}
          </h1>
          <p className="text-xs text-[#565F52] mt-0.5">
            Every user action, inventory change, financial transaction, and role activity is permanently logged.
          </p>
        </div>

        <button
          onClick={exportAuditCsv}
          className="inline-flex items-center gap-2 bg-[#182620] hover:bg-[#0F1913] text-white px-3.5 py-2 rounded text-xs font-semibold shadow-xs"
        >
          <Download className="w-3.5 h-3.5 text-[#CC9A2E]" />
          <span>Export Audit Log (CSV)</span>
        </button>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white p-3.5 rounded-lg border border-[#CBCFB9]">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-[#565F52] absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search action, details, user..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full text-xs bg-[#FBFAF5] border border-[#CBCFB9] rounded pl-9 pr-3 py-2 text-[#0F1913] focus:outline-none focus:border-[#A87C1F]"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
          {['ALL', 'AUTH', 'ORDERS', 'INVENTORY', 'HR', 'GST', 'SYSTEM'].map((mod) => (
            <button
              key={mod}
              onClick={() => setModuleFilter(mod)}
              className={`text-xs px-3 py-1.5 rounded font-semibold whitespace-nowrap capitalize transition-colors ${
                moduleFilter === mod
                  ? 'bg-[#182620] text-white'
                  : 'bg-[#FBFAF5] text-[#565F52] border border-[#CBCFB9] hover:bg-[#E4E8D9]'
              }`}
            >
              {mod}
            </button>
          ))}
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-lg border border-[#CBCFB9] overflow-hidden shadow-xs">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-[#EEF0E7] text-[#0F1913] font-bold text-[10px] uppercase border-b border-[#CBCFB9]">
              <th className="p-3">Timestamp</th>
              <th className="p-3">User & Role</th>
              <th className="p-3">Module</th>
              <th className="p-3">Action Event</th>
              <th className="p-3">Detailed Payload / Description</th>
              <th className="p-3 text-right">Node IP</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#CBCFB9]/40 font-sans">
            {filteredLogs.map((log) => (
              <tr key={log.id} className="hover:bg-[#FBFAF5] transition-colors">
                <td className="p-3 font-mono text-[11px] text-[#565F52]">
                  {log.timestamp.replace('T', ' ').slice(0, 19)}
                </td>

                <td className="p-3">
                  <span className="font-bold text-[#0F1913] block">{log.userName}</span>
                  <span className="text-[10px] text-[#A87C1F] font-mono uppercase">{log.userRole}</span>
                </td>

                <td className="p-3 font-mono">
                  <span className="bg-[#E4E8D9] text-[#182620] px-2 py-0.5 rounded text-[10px] font-bold">
                    {log.module}
                  </span>
                </td>

                <td className="p-3 font-semibold text-[#0F1913]">
                  {log.action}
                </td>

                <td className="p-3 text-[#565F52] max-w-md">
                  {log.details}
                </td>

                <td className="p-3 text-right font-mono text-[10px] text-[#565F52]">
                  {log.ipAddress || '127.0.0.1'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
