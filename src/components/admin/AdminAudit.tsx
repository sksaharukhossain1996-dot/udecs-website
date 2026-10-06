import {isBundledAuditExample} from '../../lib/auditEvidence';
import{saveExport}from'../../lib/exportFile';
import {csvText,auditIp} from '../../lib/csvExport';
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


function auditTime(value:string){
 if(!value)return 'Time not recorded';
 if(!/(Z|[+-]\d{2}:\d{2})$/.test(value))return value+' (timezone not recorded)';
 const d=new Date(value);return Number.isFinite(d.getTime())?d.toLocaleString('en-IN',{timeZone:'Asia/Kolkata',hour12:false})+' IST':value+' (invalid date)';
}

export const AdminAudit: React.FC = () => {
  const { auditLogs, language } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [moduleFilter, setModuleFilter] = useState('ALL');
  const [showExamples,setShowExamples]=useState(false);
  const isExample=isBundledAuditExample;
  const exampleCount=auditLogs.filter(isExample).length;

  const filteredLogs = auditLogs.filter((log) => {
    const matchesSearch =
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.userName || log.user || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesModule = moduleFilter === 'ALL' || log.module === moduleFilter;
    return matchesSearch && matchesModule && (showExamples || !isExample(log));
  });

  const exportAuditCsv = async () => {
    const headers = ['Timestamp (raw, original timezone)', 'User', 'Role', 'Module', 'Action', 'Details', 'IP Address', 'Evidence status'];
    const rows = filteredLogs.map((l) => [
      l.timestamp,
      l.userName || l.user,
      l.userRole || l.role,
      l.module,
      l.action,
      l.details,
      auditIp(l.ipAddress),
      isExample(l)?'Example, not a business event':'Client record; not independently verified',
    ]);
    try{await saveExport(new Blob([csvText([headers,...rows])],{type:'text/csv;charset=utf-8'}),`udecs_audit_logs_${Date.now()}.csv`);}catch(e){alert(e instanceof Error?e.message:'CSV export failed.');}
  };

  return (
    <div className="p-6 sm:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#CBCFB9]">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black font-heading text-[#0F1913]">
            {language === 'bn'
              ? 'নিরাপত্তা ও অপরিবর্তনীয় সিস্টেম অডিট ট্রেইল'
              : 'Recorded Activity Logs'}
          </h1>
          <p className="text-xs text-[#565F52] mt-0.5">
            Loaded recorded activity only. Coverage is incomplete; client-originated entries are not independent proof of who performed an action.
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

      <div role="status" className="border rounded p-4 bg-amber-50 text-sm">This is browser-recorded activity, not a complete immutable server audit. Exact bundled examples are hidden by default, retained rather than deleted. IP values are unknown unless independently recorded. <label className="block mt-2"><input type="checkbox" checked={showExamples} onChange={e=>setShowExamples(e.target.checked)}/> Show {exampleCount} retained example entries (not real business events)</label></div>
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
      <div className="bg-white rounded-lg border border-[#CBCFB9] overflow-x-auto shadow-xs">
        <table className="w-full min-w-[760px] text-left text-xs border-collapse">
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
                  {auditTime(log.timestamp)}
                </td>

                <td className="p-3">
                  <span className="font-bold text-[#0F1913] block">{log.userName || log.user || 'Not recorded'}</span>
                  <span className="text-[10px] text-[#A87C1F] font-mono uppercase">{log.userRole || log.role || 'Not recorded'}</span>
                </td>

                <td className="p-3 font-mono">
                  <span className="bg-[#E4E8D9] text-[#182620] px-2 py-0.5 rounded text-[10px] font-bold">
                    {log.module}
                  </span>
                </td>

                <td className="p-3 font-semibold text-[#0F1913]">
                  {log.action}{isExample(log)&&<span className="ml-2 text-amber-900">[Example]</span>}
                </td>

                <td className="p-3 text-[#565F52] max-w-md">
                  {log.details}
                </td>

                <td className="p-3 text-right font-mono text-[10px] text-[#565F52]">
                  {auditIp(log.ipAddress)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
