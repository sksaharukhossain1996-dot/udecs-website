import React, { useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { Employee, SalarySlip } from '../../types';
import {
  Users,
  UserPlus,
  Printer,
  Calendar,
  DollarSign,
  ShieldCheck,
  CheckCircle,
  Clock,
  FileText,
  AlertCircle,
} from 'lucide-react';

export const AdminHR: React.FC = () => {
  const {
    employees,
    attendance,
    markAttendance,
    salarySlips,
    generateSalarySlip,
    formatPrice,
    company,
    language,
  } = useStore();

  const [activeTab, setActiveTab] = useState<'employees' | 'attendance' | 'payroll'>('employees');
  const [selectedMonth, setSelectedMonth] = useState('2026-09');
  const [activeSlip, setActiveSlip] = useState<SalarySlip | null>(null);

  const handleGenerateSlipForEmployee = (emp: Employee) => {
    // Days worked estimation based on attendance
    const empAttendance = attendance.filter(
      (a) => a.employeeId === emp.id && a.date.startsWith(selectedMonth)
    );
    const presentDays = empAttendance.filter((a) => a.status === 'present').length || 26;
    const workingDays = 30;

    const slip = generateSalarySlip(emp.id, selectedMonth, workingDays, presentDays);
    setActiveSlip(slip);
  };

  const getAttendanceStatus = (empId: string, dateStr: string) => {
    const record = attendance.find((a) => a.employeeId === empId && a.date === dateStr);
    return record ? record.status : 'present';
  };

  const todayStr = '2026-09-24';

  return (
    <div className="p-6 sm:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#CBCFB9]">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black font-heading text-[#0F1913]">
            {language === 'bn'
              ? 'কর্মচারী ব্যবস্থাপনা, হাজিরা ও পে-রোল স্যালারি স্লিপ'
              : 'HR Staff Management, Attendance & Salary Slip Generator'}
          </h1>
          <p className="text-xs text-[#565F52] mt-0.5">
            Role-Based Access Control (RBAC), biometric attendance tracking, and statutory salary slips.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold bg-[#E4E8D9] text-[#182620] px-2.5 py-1 rounded font-mono">
            {employees.length} Active Staff Members
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-[#CBCFB9] pb-2 no-print">
        <button
          onClick={() => setActiveTab('employees')}
          className={`text-xs px-4 py-2 rounded-t font-bold transition-all ${
            activeTab === 'employees'
              ? 'bg-[#182620] text-white'
              : 'bg-[#FBFAF5] text-[#565F52] border border-[#CBCFB9]'
          }`}
        >
          Staff Directory & Access Roles
        </button>
        <button
          onClick={() => setActiveTab('attendance')}
          className={`text-xs px-4 py-2 rounded-t font-bold transition-all ${
            activeTab === 'attendance'
              ? 'bg-[#182620] text-white'
              : 'bg-[#FBFAF5] text-[#565F52] border border-[#CBCFB9]'
          }`}
        >
          Daily & Monthly Attendance
        </button>
        <button
          onClick={() => setActiveTab('payroll')}
          className={`text-xs px-4 py-2 rounded-t font-bold transition-all ${
            activeTab === 'payroll'
              ? 'bg-[#182620] text-white'
              : 'bg-[#FBFAF5] text-[#565F52] border border-[#CBCFB9]'
          }`}
        >
          Salary Slip Generator & Payroll
        </button>
      </div>

      {/* TAB 1: EMPLOYEES & RBAC */}
      {activeTab === 'employees' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {employees.map((emp) => (
              <div
                key={emp.id}
                className="bg-white p-5 rounded-lg border border-[#CBCFB9] shadow-xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-mono text-[10px] font-bold text-[#A87C1F]">
                        {emp.employeeCode}
                      </span>
                      <h3 className="font-bold text-base text-[#0F1913] mt-0.5">{emp.name}</h3>
                      <p className="text-xs text-[#565F52]">{emp.designation}</p>
                    </div>
                    <span className="bg-[#182620] text-[#CC9A2E] text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase">
                      {emp.role}
                    </span>
                  </div>

                  <div className="mt-4 pt-3 border-t border-[#CBCFB9]/50 text-xs space-y-1.5 text-[#565F52]">
                    <div className="flex justify-between">
                      <span>Department:</span>
                      <span className="font-semibold text-[#0F1913]">{emp.department}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Base Salary:</span>
                      <span className="font-bold text-[#3C6656]">{formatPrice(emp.baseSalary)}/mo</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Bank Account:</span>
                      <span className="font-mono">{emp.bankAccount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Contact Phone:</span>
                      <span className="font-mono">{emp.phone}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-[#CBCFB9] flex gap-2">
                  <button
                    onClick={() => {
                      setActiveTab('payroll');
                      handleGenerateSlipForEmployee(emp);
                    }}
                    className="flex-1 bg-[#182620] hover:bg-[#0F1913] text-white py-1.5 rounded text-xs font-semibold flex items-center justify-center gap-1"
                  >
                    <FileText className="w-3.5 h-3.5 text-[#CC9A2E]" />
                    <span>Generate Salary Slip</span>
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* RBAC Access Matrix Table */}
          <div className="bg-white p-5 rounded-lg border border-[#CBCFB9] shadow-xs mt-6">
            <h4 className="font-heading font-bold text-sm text-[#0F1913] uppercase tracking-wider mb-3">
              Role-Based Access Control (RBAC) Security Permissions Matrix
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-[#EEF0E7] text-[#0F1913] font-bold text-[10px] uppercase border-b border-[#CBCFB9]">
                    <th className="p-2">Role</th>
                    <th className="p-2 text-center">Store Catalog</th>
                    <th className="p-2 text-center">Orders & Dispatch</th>
                    <th className="p-2 text-center">Stock Adjustment</th>
                    <th className="p-2 text-center">GST Reports</th>
                    <th className="p-2 text-center">Payroll Slips</th>
                    <th className="p-2 text-center">Audit Logs</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#CBCFB9]/40">
                  <tr>
                    <td className="p-2 font-bold text-[#0F1913]">Admin (Full Access)</td>
                    <td className="p-2 text-center text-green-700 font-bold">✓ Full</td>
                    <td className="p-2 text-center text-green-700 font-bold">✓ Full</td>
                    <td className="p-2 text-center text-green-700 font-bold">✓ Full</td>
                    <td className="p-2 text-center text-green-700 font-bold">✓ Full</td>
                    <td className="p-2 text-center text-green-700 font-bold">✓ Full</td>
                    <td className="p-2 text-center text-green-700 font-bold">✓ Full</td>
                  </tr>
                  <tr>
                    <td className="p-2 font-bold text-[#0F1913]">Operations Manager</td>
                    <td className="p-2 text-center text-green-700 font-bold">✓ Full</td>
                    <td className="p-2 text-center text-green-700 font-bold">✓ Full</td>
                    <td className="p-2 text-center text-green-700 font-bold">✓ Full</td>
                    <td className="p-2 text-center text-blue-700">Read Only</td>
                    <td className="p-2 text-center text-blue-700">Attendance</td>
                    <td className="p-2 text-center text-blue-700">Read Only</td>
                  </tr>
                  <tr>
                    <td className="p-2 font-bold text-[#0F1913]">Logistics Officer</td>
                    <td className="p-2 text-center text-gray-400">Read</td>
                    <td className="p-2 text-center text-green-700 font-bold">✓ Dispatch AWB</td>
                    <td className="p-2 text-center text-green-700 font-bold">✓ Receive Pallet</td>
                    <td className="p-2 text-center text-gray-400">No Access</td>
                    <td className="p-2 text-center text-gray-400">No Access</td>
                    <td className="p-2 text-center text-blue-700">Logistics Log</td>
                  </tr>
                  <tr>
                    <td className="p-2 font-bold text-[#0F1913]">Accounts Officer</td>
                    <td className="p-2 text-center text-gray-400">Read</td>
                    <td className="p-2 text-center text-blue-700">Invoices</td>
                    <td className="p-2 text-center text-gray-400">No Access</td>
                    <td className="p-2 text-center text-green-700 font-bold">✓ Full GSTR</td>
                    <td className="p-2 text-center text-green-700 font-bold">✓ Full Payroll</td>
                    <td className="p-2 text-center text-blue-700">Financial Log</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ATTENDANCE */}
      {activeTab === 'attendance' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-lg border border-[#CBCFB9] flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs">
              <Calendar className="w-4 h-4 text-[#3C6656]" />
              <span className="font-bold text-[#0F1913]">Current Attendance Date:</span>
              <span className="font-mono font-bold bg-[#E4E8D9] px-2 py-0.5 rounded">{todayStr}</span>
            </div>

            <div className="text-xs text-[#565F52]">
              Mark daily check-in for payroll calculation and biometric record synchronization.
            </div>
          </div>

          <div className="bg-white rounded-lg border border-[#CBCFB9] overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#EEF0E7] text-[#0F1913] font-bold text-[10px] uppercase border-b border-[#CBCFB9]">
                  <th className="p-3">Employee</th>
                  <th className="p-3">Department</th>
                  <th className="p-3">Designation</th>
                  <th className="p-3">Today Status ({todayStr})</th>
                  <th className="p-3 text-right">Update Daily Log</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#CBCFB9]/40">
                {employees.map((emp) => {
                  const status = getAttendanceStatus(emp.id, todayStr);
                  return (
                    <tr key={emp.id} className="hover:bg-gray-50">
                      <td className="p-3">
                        <span className="font-bold text-[#0F1913] block">{emp.name}</span>
                        <span className="font-mono text-[10px] text-[#A87C1F]">{emp.employeeCode}</span>
                      </td>
                      <td className="p-3 font-medium">{emp.department}</td>
                      <td className="p-3 text-[#565F52]">{emp.designation}</td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded font-bold uppercase text-[10px] ${
                            status === 'present'
                              ? 'bg-green-100 text-green-800'
                              : status === 'half-day'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {status}
                        </span>
                      </td>
                      <td className="p-3 text-right space-x-1">
                        <button
                          onClick={() => markAttendance(emp.id, todayStr, 'present')}
                          className={`px-2.5 py-1 rounded font-semibold text-[11px] ${
                            status === 'present'
                              ? 'bg-green-700 text-white'
                              : 'bg-gray-100 hover:bg-gray-200 text-gray-800'
                          }`}
                        >
                          Present
                        </button>
                        <button
                          onClick={() => markAttendance(emp.id, todayStr, 'half-day')}
                          className={`px-2.5 py-1 rounded font-semibold text-[11px] ${
                            status === 'half-day'
                              ? 'bg-amber-600 text-white'
                              : 'bg-gray-100 hover:bg-gray-200 text-gray-800'
                          }`}
                        >
                          Half-Day
                        </button>
                        <button
                          onClick={() => markAttendance(emp.id, todayStr, 'absent')}
                          className={`px-2.5 py-1 rounded font-semibold text-[11px] ${
                            status === 'absent'
                              ? 'bg-red-700 text-white'
                              : 'bg-gray-100 hover:bg-gray-200 text-gray-800'
                          }`}
                        >
                          Absent
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: SALARY SLIP GENERATOR & PAYROLL */}
      {activeTab === 'payroll' && (
        <div className="space-y-6">
          <div className="bg-white p-4 rounded-lg border border-[#CBCFB9] flex flex-wrap items-center justify-between gap-3 no-print">
            <div className="flex items-center gap-2 text-xs">
              <span className="font-bold text-[#0F1913]">Pay Slip Month:</span>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-[#FBFAF5] border border-[#CBCFB9] rounded px-2.5 py-1 text-xs font-mono"
              >
                <option value="2026-09">September 2026</option>
                <option value="2026-08">August 2026</option>
              </select>
            </div>

            <div className="flex gap-2">
              {employees.map((emp) => (
                <button
                  key={emp.id}
                  onClick={() => handleGenerateSlipForEmployee(emp)}
                  className="px-2.5 py-1 bg-[#EEF0E7] hover:bg-[#182620] hover:text-white rounded text-xs font-medium border border-[#CBCFB9] transition-colors"
                >
                  Generate {emp.name.split(' ')[0]}
                </button>
              ))}
            </div>
          </div>

          {/* Printable Salary Slip Component */}
          {activeSlip ? (
            <div className="space-y-4">
              <div className="flex justify-end no-print">
                <button
                  onClick={() => window.print()}
                  className="bg-[#182620] hover:bg-[#0F1913] text-white px-4 py-2 rounded text-xs font-bold flex items-center gap-2"
                >
                  <Printer className="w-4 h-4 text-[#CC9A2E]" />
                  <span>Print Official Salary Slip</span>
                </button>
              </div>

              {/* Physical Slip Layout */}
              <div
                id="printable-area"
                className="bg-white border border-[#CBCFB9] p-8 rounded-lg shadow-sm text-xs font-sans space-y-5 max-w-3xl mx-auto"
              >
                {/* Header */}
                <div className="flex justify-between items-start border-b-2 border-[#0F1913] pb-4">
                  <div>
                    <h3 className="font-heading font-black text-xl text-[#0F1913]">
                      {company.name}
                    </h3>
                    <p className="text-[11px] text-[#565F52] font-medium">{company.legalName}</p>
                    <p className="text-[11px] text-[#565F52]">{company.address}</p>
                    <p className="text-[11px] font-bold text-[#0F1913] mt-1">
                      GSTIN: <span className="font-mono">{company.gstin}</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="bg-[#182620] text-[#CC9A2E] text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase">
                      CONFIDENTIAL PAYSLIP
                    </span>
                    <p className="font-mono font-bold mt-1 text-sm">{activeSlip.id}</p>
                    <p className="text-[11px] text-[#565F52]">Month: {activeSlip.month}</p>
                  </div>
                </div>

                {/* Employee Profile Grid */}
                <div className="grid grid-cols-2 gap-4 bg-[#FBFAF5] p-3.5 rounded border border-[#CBCFB9] text-xs">
                  <div className="space-y-1">
                    <div>
                      <span className="text-[#565F52]">Employee Name:</span>{' '}
                      <span className="font-bold text-[#0F1913]">{activeSlip.employeeName}</span>
                    </div>
                    <div>
                      <span className="text-[#565F52]">Employee Code:</span>{' '}
                      <span className="font-mono font-bold">{activeSlip.employeeCode}</span>
                    </div>
                    <div>
                      <span className="text-[#565F52]">Designation:</span>{' '}
                      <span className="font-semibold">{activeSlip.designation}</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div>
                      <span className="text-[#565F52]">Total Working Days:</span>{' '}
                      <span className="font-bold">{activeSlip.workingDays}</span>
                    </div>
                    <div>
                      <span className="text-[#565F52]">Present Days:</span>{' '}
                      <span className="font-bold text-[#3C6656]">{activeSlip.presentDays}</span>
                    </div>
                    <div>
                      <span className="text-[#565F52]">Payment Status:</span>{' '}
                      <span className="font-bold text-green-700 uppercase">PROCESSED</span>
                    </div>
                  </div>
                </div>

                {/* Earnings vs Deductions Table */}
                <div className="grid grid-cols-2 gap-6">
                  {/* Earnings */}
                  <div>
                    <h5 className="font-bold text-xs uppercase tracking-wider text-[#0F1913] border-b border-[#CBCFB9] pb-1.5 mb-2">
                      Earnings (Allowances)
                    </h5>
                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between">
                        <span>Basic Salary:</span>
                        <span className="font-mono font-semibold">{formatPrice(activeSlip.basicSalary ?? activeSlip.baseSalary)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>House Rent Allowance (HRA):</span>
                        <span className="font-mono font-semibold">{formatPrice(activeSlip.hra)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Dearness Allowance (DA):</span>
                        <span className="font-mono font-semibold">{formatPrice(activeSlip.da ?? 0)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Special / Conveyance:</span>
                        <span className="font-mono font-semibold">{formatPrice(activeSlip.specialAllowance)}</span>
                      </div>
                      <div className="flex justify-between pt-2 border-t border-[#CBCFB9] font-bold text-[#0F1913]">
                        <span>Gross Earnings:</span>
                        <span className="font-mono">{formatPrice(activeSlip.grossSalary)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Deductions */}
                  <div>
                    <h5 className="font-bold text-xs uppercase tracking-wider text-[#0F1913] border-b border-[#CBCFB9] pb-1.5 mb-2">
                      Statutory Deductions
                    </h5>
                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between">
                        <span>Provident Fund (PF):</span>
                        <span className="font-mono font-semibold">{formatPrice(activeSlip.pfDeduction)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Employee State Insurance (ESI):</span>
                        <span className="font-mono font-semibold">{formatPrice(activeSlip.esiDeduction)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Professional Tax (PT):</span>
                        <span className="font-mono font-semibold">{formatPrice(activeSlip.taxDeduction ?? activeSlip.tdsDeduction)}</span>
                      </div>
                      <div className="flex justify-between pt-2 border-t border-[#CBCFB9] font-bold text-red-800">
                        <span>Total Deductions:</span>
                        <span className="font-mono">{formatPrice(activeSlip.totalDeductions)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Net Pay Banner */}
                <div className="bg-[#182620] text-white p-4 rounded-md flex justify-between items-center">
                  <div>
                    <span className="text-[10px] text-[#B9BFAE] uppercase font-mono block">
                      NET TAKE HOME SALARY
                    </span>
                    <span className="text-2xl font-black text-[#CC9A2E] font-sans">
                      {formatPrice(activeSlip.netSalary)}
                    </span>
                  </div>
                  <div className="text-right text-[11px] text-[#B9BFAE]">
                    <span>Bank Transfer to Salary A/C</span>
                    <p className="text-white font-mono">NEFT / RTGS Ref: UDECS-SAL-{Date.now().toString().slice(-6)}</p>
                  </div>
                </div>

                {/* Signatures */}
                <div className="pt-8 border-t border-[#CBCFB9] flex justify-between items-end text-[10px] text-[#565F52]">
                  <div>
                    <div className="w-32 border-b border-gray-400 mb-1"></div>
                    <span>Employee Signature</span>
                  </div>
                  <div className="text-right">
                    <div className="w-36 border-b border-gray-400 mb-1 ml-auto"></div>
                    <span className="font-bold text-[#0F1913]">UNICK DIGITAL E-COMMERCE SOLUTIONS</span>
                    <p className="text-[9px]">Authorized Payroll Signatory</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white p-8 rounded-lg border border-[#CBCFB9] text-center text-[#565F52]">
              <FileText className="w-10 h-10 mx-auto text-[#CBCFB9] mb-2" />
              <p className="text-sm font-bold text-[#0F1913]">No Salary Slip Selected</p>
              <p className="text-xs text-[#565F52] mt-1">
                Click on any staff member above to automatically compute attendance and generate official salary slip.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
