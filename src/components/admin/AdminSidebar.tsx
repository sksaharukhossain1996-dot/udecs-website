import React from 'react';
import { useStore } from '../../context/StoreContext';
import { BrandLogo } from '../common/BrandLogo';
import {
  LayoutDashboard,
  ShoppingBag,
  Boxes,
  FileSpreadsheet,
  Users,
  FileEdit,
  Bell,
  History,
  Settings,
  LogOut,
  UserCheck,
  Shield,
  ArrowLeft,
  Globe,
  Mail,
  MessageSquare,
} from 'lucide-react';

export type AdminTab =
  | 'overview'
  | 'website_control'
  | 'whatsapp_automation'
  | 'orders'
  | 'inventory'
  | 'gst'
  | 'hr'
  | 'collaboration'
  | 'notifications'
  | 'gmail'
  | 'audit'
  | 'settings';

interface AdminSidebarProps {
  currentTab: AdminTab;
  onSelectTab: (tab: AdminTab) => void;
  onExitAdmin: () => void;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  currentTab,
  onSelectTab,
  onExitAdmin,
}) => {
  const {
    currentUser,
    logout,
    company,
    language,
    isFirebaseConnected,
    firebaseUser,
    signOutFirebaseAuth,
  } = useStore();

  const navItems: { id: AdminTab; labelBn: string; labelEn: string; icon: any; roleMin?: string }[] = [
    { id: 'overview', labelBn: 'ড্যাশবোর্ড ওভারভিউ', labelEn: 'Executive Dashboard', icon: LayoutDashboard },
    { id: 'website_control', labelBn: 'ওয়েবসাইট সেটিংস ও কন্ট্রোল', labelEn: 'Website Settings & Control', icon: Globe },
    { id: 'whatsapp_automation', labelBn: 'হোয়াটসঅ্যাপ অটোমেশন 🟢', labelEn: 'WhatsApp Automation Hub', icon: MessageSquare },
    { id: 'orders', labelBn: 'অর্ডার ও লজিস্টিকস শিপিং', labelEn: 'Orders & Logistics', icon: ShoppingBag },
    { id: 'inventory', labelBn: 'অটোমেটেড ইনভেন্টরি', labelEn: 'Automated Inventory', icon: Boxes },
    { id: 'gst', labelBn: 'জিএসটি রিপোর্ট ও ট্যাক্স', labelEn: 'GST Reports & Filing', icon: FileSpreadsheet },
    { id: 'hr', labelBn: 'কর্মচারী ও স্যালারি স্লিপ', labelEn: 'HR, Attendance & Payroll', icon: Users },
    { id: 'collaboration', labelBn: 'টিম কোলাবরেশন নোটস', labelEn: 'Live Collaboration', icon: FileEdit },
    { id: 'gmail', labelBn: 'Gmail হাব ও গ্রাহক মেল', labelEn: 'Gmail Workspace Hub', icon: Mail },
    { id: 'notifications', labelBn: 'নোটিফিকেশন ও SMS হাব', labelEn: 'Notifications & SMS', icon: Bell },
    { id: 'audit', labelBn: 'সিস্টেম অডিট ট্রেইল লগ', labelEn: 'System Audit Trail', icon: History },
    { id: 'settings', labelBn: 'PayU ও সিস্টেম সেটিংস', labelEn: 'PayU & Settings', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-[#0F1913] text-[#B9BFAE] border-r border-[#CBCFB9]/20 flex flex-col justify-between shrink-0">
      {/* Brand Header */}
      <div>
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <div className="flex flex-col">
            <BrandLogo size="xs" textColor="text-white" subtextColor="text-[#CC9A2E]" />
            <p className="text-[10px] text-[#B9BFAE]/80 font-mono mt-1">
              GSTIN: {company.gstin}
            </p>
          </div>

          <button
            onClick={onExitAdmin}
            className="p-1.5 rounded hover:bg-white/10 text-[#B9BFAE] hover:text-white"
            title="Return to Online Store"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
        </div>

        {/* User Card */}
        {currentUser && (
          <div className="p-3.5 bg-white/5 border-b border-white/10 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#3C6656] text-white flex items-center justify-center font-bold text-xs">
              {currentUser.name.charAt(0)}
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-xs font-bold text-white block truncate">
                {currentUser.name}
              </span>
              <div className="flex items-center gap-1.5 text-[10px] text-[#CC9A2E] font-mono">
                <Shield className="w-3 h-3" />
                <span className="uppercase">{currentUser.role}</span>
                {isFirebaseConnected && (
                  <span className="text-[9px] text-emerald-400 bg-emerald-950/60 px-1 py-0.5 rounded border border-emerald-800">
                    Live
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Navigation List */}
        <nav className="p-2 space-y-1 overflow-y-auto max-h-[calc(100vh-250px)]">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-[#182620] text-white font-bold border-l-3 border-[#CC9A2E]'
                    : 'text-[#B9BFAE] hover:bg-white/5 hover:text-white'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-[#CC9A2E]' : 'text-[#8C9482]'}`} />
                <span className="truncate">
                  {language === 'bn' ? item.labelBn : item.labelEn}
                </span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer / Logout */}
      <div className="p-3 border-t border-white/10 space-y-2">
        <button
          onClick={onExitAdmin}
          className="w-full flex items-center justify-center gap-2 text-xs text-[#B9BFAE] hover:text-white bg-white/5 hover:bg-white/10 py-2 rounded transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>{language === 'bn' ? 'স্টোরে ফিরে যান' : 'Back to Storefront'}</span>
        </button>

        <button
          onClick={() => {
            if (firebaseUser) {
              signOutFirebaseAuth();
            } else {
              logout();
            }
          }}
          className="w-full flex items-center justify-center gap-2 text-xs text-red-300 hover:text-red-200 bg-red-950/40 hover:bg-red-900/60 py-2 rounded transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>{language === 'bn' ? 'লগআউট' : 'Sign Out'}</span>
        </button>
      </div>
    </aside>
  );
};
