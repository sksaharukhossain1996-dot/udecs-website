import React from 'react';
import { useStore } from '../../context/StoreContext';
import { AdminTab } from './AdminSidebar';
import {
  TrendingUp,
  ShoppingBag,
  Boxes,
  AlertTriangle,
  FileSpreadsheet,
  Users,
  CreditCard,
  ArrowUpRight,
  ShieldCheck,
} from 'lucide-react';

interface AdminOverviewProps {
  onNavigate: (tab: AdminTab) => void;
}

export const AdminOverview: React.FC<AdminOverviewProps> = ({ onNavigate }) => {
  const { orders, products, employees, auditLogs, formatPrice, company, language } = useStore();

  const totalSales = orders.reduce((sum, o) => sum + o.totalAmount, 0);
  const totalGstCollected = orders.reduce((sum, o) => sum + o.totalGst, 0);
  const pendingOrders = orders.filter((o) => o.orderStatus === 'processing' || o.orderStatus === 'pending');
  const lowStockProducts = products.filter((p) => p.stock <= p.minStockAlert);
  const totalInventoryValue = products.reduce((sum, p) => sum + p.price * p.stock, 0);

  return (
    <div className="p-6 sm:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Page Title & Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#CBCFB9]">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black font-heading text-[#0F1913]">
            {language === 'bn' ? 'এক্সিকিউটিভ ড্যাশবোর্ড ও অ্যানালিটিক্স' : 'Business Performance & Executive Analytics'}
          </h1>
          <p className="text-xs text-[#565F52] mt-0.5">
            {company.legalName} · Live Node: <span className="font-mono font-bold text-[#3C6656]">{company.domain}</span> · GST: {company.gstin}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#E4E8D9] text-[#3C6656] text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-[#3C6656] animate-pulse"></span>
            PayU Gateway Active
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#182620] text-[#CC9A2E] text-xs font-semibold font-mono">
            Delhivery API Sync
          </span>
        </div>
      </div>

      {/* KPI Stat Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Sales */}
        <div className="bg-white p-5 rounded-lg border border-[#CBCFB9] shadow-xs">
          <div className="flex items-center justify-between text-[#565F52] mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Gross Sales (Total)</span>
            <div className="p-2 bg-[#3C6656]/10 text-[#3C6656] rounded-md">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-[#0F1913] font-sans">
            {formatPrice(totalSales)}
          </div>
          <div className="mt-2 text-[11px] text-[#3C6656] flex items-center gap-1 font-semibold">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>+18.4% this month · {orders.length} Orders</span>
          </div>
        </div>

        {/* GST Tax Collected */}
        <div className="bg-white p-5 rounded-lg border border-[#CBCFB9] shadow-xs">
          <div className="flex items-center justify-between text-[#565F52] mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">GST Collected</span>
            <div className="p-2 bg-[#CC9A2E]/10 text-[#A87C1F] rounded-md">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-[#0F1913] font-sans">
            {formatPrice(totalGstCollected)}
          </div>
          <div className="mt-2 text-[11px] text-[#565F52] flex items-center justify-between">
            <span>CGST + SGST (WB 19)</span>
            <button
              onClick={() => onNavigate('gst')}
              className="text-[#A87C1F] font-bold underline hover:text-[#0F1913]"
            >
              GSTR-1 Report
            </button>
          </div>
        </div>

        {/* Pending Shipments */}
        <div className="bg-white p-5 rounded-lg border border-[#CBCFB9] shadow-xs">
          <div className="flex items-center justify-between text-[#565F52] mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Pending Fulfillment</span>
            <div className="p-2 bg-blue-100 text-blue-800 rounded-md">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-[#0F1913]">
            {pendingOrders.length}
          </div>
          <div className="mt-2 text-[11px] text-[#565F52] flex items-center justify-between">
            <span>Ready for Delhivery/Blue Dart</span>
            <button
              onClick={() => onNavigate('orders')}
              className="text-[#3C6656] font-bold underline hover:text-[#0F1913]"
            >
              Dispatch Now
            </button>
          </div>
        </div>

        {/* Inventory Stock Valuation & Low Stock Alert */}
        <div className="bg-white p-5 rounded-lg border border-[#CBCFB9] shadow-xs">
          <div className="flex items-center justify-between text-[#565F52] mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Stock Valuation</span>
            <div className="p-2 bg-amber-100 text-amber-800 rounded-md">
              <Boxes className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-[#0F1913]">
            {formatPrice(totalInventoryValue)}
          </div>
          <div className="mt-2 text-[11px] flex items-center justify-between">
            {lowStockProducts.length > 0 ? (
              <span className="text-amber-700 font-bold flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                {lowStockProducts.length} low stock SKUs
              </span>
            ) : (
              <span className="text-[#3C6656] font-semibold">Stock healthy</span>
            )}
            <button
              onClick={() => onNavigate('inventory')}
              className="text-[#A87C1F] font-bold underline"
            >
              Restock
            </button>
          </div>
        </div>
      </div>

      {/* Quick Access Action Bar */}
      <div className="bg-[#EEF0E7] p-4 rounded-lg border border-[#CBCFB9] flex flex-wrap items-center justify-between gap-3">
        <span className="text-xs font-bold text-[#0F1913] uppercase tracking-wider">
          Quick Management Actions:
        </span>
        <div className="flex flex-wrap gap-2 text-xs">
          <button
            onClick={() => onNavigate('website_control')}
            className="bg-[#CC9A2E] hover:bg-[#A87C1F] text-[#0F1913] px-3.5 py-1.5 rounded font-bold transition-colors shadow-xs flex items-center gap-1.5"
          >
            <span>🔗 Edit Website Texts & Sell via Link</span>
          </button>
          <button
            onClick={() => onNavigate('orders')}
            className="bg-[#182620] hover:bg-[#0F1913] text-white px-3 py-1.5 rounded font-semibold transition-colors"
          >
            Process Orders & Print AWB
          </button>
          <button
            onClick={() => onNavigate('gmail')}
            className="bg-red-50 hover:bg-red-100 text-red-800 border border-red-200 px-3 py-1.5 rounded font-semibold transition-colors flex items-center gap-1.5"
          >
            <span>✉️ Gmail Workspace Hub</span>
          </button>
          <button
            onClick={() => onNavigate('inventory')}
            className="bg-white hover:bg-[#E4E8D9] text-[#0F1913] border border-[#CBCFB9] px-3 py-1.5 rounded font-semibold transition-colors"
          >
            + Update Inventory Stock
          </button>
          <button
            onClick={() => onNavigate('gst')}
            className="bg-white hover:bg-[#E4E8D9] text-[#0F1913] border border-[#CBCFB9] px-3 py-1.5 rounded font-semibold transition-colors"
          >
            Generate Monthly GSTR-1
          </button>
          <button
            onClick={() => onNavigate('hr')}
            className="bg-white hover:bg-[#E4E8D9] text-[#0F1913] border border-[#CBCFB9] px-3 py-1.5 rounded font-semibold transition-colors"
          >
            Generate Salary Slips ({employees.length} Staff)
          </button>
        </div>
      </div>

      {/* Two Columns: Recent Orders and Real-time Audit Trail */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Recent Orders */}
        <div className="lg:col-span-7 bg-white p-5 rounded-lg border border-[#CBCFB9] shadow-xs">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#CBCFB9]">
            <h3 className="font-heading font-bold text-sm text-[#0F1913] uppercase tracking-wider">
              Recent Sales Orders
            </h3>
            <button
              onClick={() => onNavigate('orders')}
              className="text-xs font-semibold text-[#A87C1F] hover:underline"
            >
              View All Orders →
            </button>
          </div>

          <div className="divide-y divide-[#CBCFB9]/40 text-xs">
            {orders.slice(0, 5).map((ord) => (
              <div key={ord.id} className="py-3 flex items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-[#0F1913]">{ord.id}</span>
                    <span className="text-[10px] bg-[#E4E8D9] text-[#182620] px-1.5 py-0.5 rounded font-medium uppercase">
                      {ord.paymentMethod}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#565F52] mt-0.5">
                    {ord.customerName} ({ord.city}) · {ord.items.length} items
                  </p>
                </div>

                <div className="text-right">
                  <span className="font-bold text-sm text-[#0F1913]">
                    {formatPrice(ord.totalAmount)}
                  </span>
                  <div className="mt-0.5">
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded uppercase ${
                        ord.orderStatus === 'delivered'
                          ? 'bg-green-100 text-green-800'
                          : ord.orderStatus === 'shipped'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {ord.orderStatus}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Audit Log Stream */}
        <div className="lg:col-span-5 bg-white p-5 rounded-lg border border-[#CBCFB9] shadow-xs">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#CBCFB9]">
            <h3 className="font-heading font-bold text-sm text-[#0F1913] uppercase tracking-wider">
              System Audit Trail
            </h3>
            <button
              onClick={() => onNavigate('audit')}
              className="text-xs font-semibold text-[#A87C1F] hover:underline"
            >
              Full Log ({auditLogs.length}) →
            </button>
          </div>

          <div className="space-y-3 text-xs">
            {auditLogs.slice(0, 5).map((log) => (
              <div key={log.id} className="p-2.5 rounded bg-[#FBFAF5] border border-[#CBCFB9]/70">
                <div className="flex items-center justify-between text-[11px] mb-1">
                  <span className="font-bold text-[#0F1913]">{log.userName} ({log.userRole})</span>
                  <span className="text-[#565F52] font-mono text-[10px]">
                    {log.timestamp.slice(11, 19)}
                  </span>
                </div>
                <p className="text-[#3C6656] font-semibold text-[11px]">{log.action}</p>
                <p className="text-[#565F52] text-[10px] truncate mt-0.5">{log.details}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
