import React, { useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { AdminSidebar, AdminTab } from './AdminSidebar';
import { AdminOverview } from './AdminOverview';
import { AdminOrders } from './AdminOrders';
import { AdminInventory } from './AdminInventory';
import { AdminGstReports } from './AdminGstReports';
import { AdminHR } from './AdminHR';
import { AdminCollaboration } from './AdminCollaboration';
import { AdminNotifications } from './AdminNotifications';
import { AdminAudit } from './AdminAudit';
import { AdminSettings } from './AdminSettings';
import { AdminWebsiteControl } from './AdminWebsiteControl';
import { AdminWhatsAppAutomation } from './AdminWhatsAppAutomation';
import { AdminGmailHub } from './AdminGmailHub';
import {
  Lock,
  Shield,
  ArrowLeft,
  UserCheck,
  Globe,
  MessageSquare,
  ExternalLink,
  CheckCircle2,
} from 'lucide-react';

interface AdminPortalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminPortal: React.FC<AdminPortalProps> = ({ isOpen, onClose }) => {
  const {
    currentUser,
    company,
    language,
    isFirebaseConnected,
    firebaseUser,
    signInWithGoogleAuth,
    signOutFirebaseAuth,
  } = useStore();
  const [currentTab, setCurrentTab] = useState<AdminTab>('overview');

  const [loginError, setLoginError] = useState('');
  const [isGoogleSigningIn, setIsGoogleSigningIn] = useState(false);

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    setIsGoogleSigningIn(true);
    setLoginError('');
    try {
      await signInWithGoogleAuth();
    } catch (err: any) {
      setLoginError(err?.message || 'Google Sign-in failed. Please try again or use email sign-in.');
    } finally {
      setIsGoogleSigningIn(false);
    }
  };

  // If not logged in, render Login Portal
  if (!currentUser) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0F1913]/70 backdrop-blur-sm animate-fadeIn">
        <div className="bg-[#FBFAF5] border border-[#CBCFB9] rounded-xl max-w-md w-full p-6 sm:p-8 shadow-2xl relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-[#E4E8D9] text-[#565F52]"
            aria-label="Close login portal"
          >
            ✕
          </button>

          <div className="text-center mb-6">
            <div className="w-12 h-12 rounded-full bg-[#182620] text-[#CC9A2E] flex items-center justify-center mx-auto mb-3 shadow-md border border-[#CC9A2E]/30">
              <Lock className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold font-heading text-[#0F1913]">
              UNICK DIGITAL ERP Portal
            </h2>
            <p className="text-xs text-[#565F52] mt-1 font-mono">
              {company.domain} · GST: {company.gstin}
            </p>
          </div>

          <div className="space-y-3.5 text-xs">
            {loginError && (
              <div className="p-2.5 rounded bg-red-100 text-red-800 text-xs font-semibold">
                {loginError}
              </div>
            )}

            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isGoogleSigningIn}
              className="w-full bg-white hover:bg-slate-50 text-[#0F1913] border border-[#CBCFB9] py-2.5 rounded font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-sm disabled:opacity-60"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>{isGoogleSigningIn ? 'Connecting to Google...' : 'Sign in with Google (Firebase)'}</span>
            </button>
          </div>

          <div className="mt-4 border-t border-[#CBCFB9] pt-3 text-center text-[11px] text-[#565F52]">
            Use an authorized Google account. Passwords are never embedded in the website.
          </div>

          {/* Firebase Live Cloud Status */}
          <div className="mt-4 pt-3 border-t border-[#CBCFB9] flex items-center justify-between text-[10px] text-[#565F52]">
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${isFirebaseConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
              <span className="font-medium">
                {isFirebaseConnected ? 'Firestore Connected (asia-south1)' : 'Offline Local Fallback Active'}
              </span>
            </div>
            <span className="font-mono text-[9px] text-[#8C9385]">udecs-store</span>
          </div>
        </div>
      </div>
    );
  }

  // Logged-in full ERP View
  return (
    <div className="fixed inset-0 z-50 bg-[#F4F6EE] flex overflow-hidden animate-fadeIn">
      {/* Sidebar */}
      <AdminSidebar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        onExitAdmin={onClose}
      />

      {/* Main Content Area with Executive Top Bar */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Executive Top Navigation Bar */}
        <header className="bg-white border-b border-[#CBCFB9] px-4 sm:px-6 py-2.5 flex items-center justify-between shrink-0 shadow-xs gap-3">
          {/* Left: Domain Indicator & Tab Shortcuts */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setCurrentTab('website_control')}
              className="flex items-center gap-1.5 bg-[#E4E8D9] hover:bg-[#d8dcce] px-2.5 py-1 rounded border border-[#CBCFB9] text-xs transition-colors cursor-pointer group"
              title="Click to view Live Domain Activation & DNS Status"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-mono font-bold text-[#0F1913] group-hover:text-[#A87C1F]">udecs.store</span>
              <span className="text-[10px] text-emerald-800 font-semibold bg-emerald-100 px-1 py-0.2 rounded hidden sm:inline">
                Live Production
              </span>
            </button>

            <button
              onClick={() => setCurrentTab('website_control')}
              className={`text-xs px-2.5 py-1 rounded font-medium flex items-center gap-1.5 transition-colors ${
                currentTab === 'website_control'
                  ? 'bg-[#182620] text-white font-bold'
                  : 'bg-[#FBFAF5] hover:bg-slate-100 text-[#565F52] border border-[#CBCFB9]'
              }`}
              title="Open Website Settings & Control Tab"
            >
              <Globe className="w-3.5 h-3.5 text-[#CC9A2E]" />
              <span className="hidden md:inline">Website Settings</span>
            </button>

            <button
              onClick={() => setCurrentTab('whatsapp_automation')}
              className={`text-xs px-2.5 py-1 rounded font-medium flex items-center gap-1.5 transition-colors ${
                currentTab === 'whatsapp_automation'
                  ? 'bg-[#182620] text-white font-bold'
                  : 'bg-[#FBFAF5] hover:bg-slate-100 text-[#565F52] border border-[#CBCFB9]'
              }`}
              title="Open WhatsApp Automation Hub"
            >
              <MessageSquare className="w-3.5 h-3.5 text-[#25D366]" />
              <span className="hidden md:inline">WhatsApp Hub</span>
            </button>
          </div>

          {/* Right: Active Admin & Fast 1-Click Switcher */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Active Admin Indicator */}
            <div className="flex items-center gap-2 bg-[#FBFAF5] border border-[#CBCFB9] px-2.5 py-1 rounded text-xs">
              <span className="w-2 h-2 rounded-full bg-[#25D366]" />
              <span className="font-bold text-[#0F1913] truncate max-w-[130px] sm:max-w-none">
                {currentUser?.email === 'sksaharukhossain1996@gmail.com'
                  ? '👑 Admin 1 (SK Saharuk Hossain)'
                  : currentUser?.email === 'ecommerceunickdigital@gmail.com'
                  ? '⚡ Admin 2 (UNICK DIGITAL)'
                  : currentUser?.name || 'Staff User'}
              </span>
              <span className="text-[10px] font-mono text-[#565F52] hidden lg:inline">
                ({currentUser?.email})
              </span>
            </div>

            <button
              onClick={onClose}
              className="text-xs text-[#565F52] hover:text-[#0F1913] p-1.5 rounded hover:bg-slate-100 flex items-center gap-1"
              title="Return to Storefront"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Storefront</span>
            </button>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto">
          {currentTab === 'overview' && (
            <AdminOverview onNavigate={(tab) => setCurrentTab(tab)} />
          )}
          {currentTab === 'website_control' && <AdminWebsiteControl />}
          {currentTab === 'whatsapp_automation' && <AdminWhatsAppAutomation />}
          {currentTab === 'orders' && <AdminOrders />}
          {currentTab === 'inventory' && <AdminInventory />}
          {currentTab === 'gst' && <AdminGstReports />}
          {currentTab === 'hr' && <AdminHR />}
          {currentTab === 'collaboration' && <AdminCollaboration />}
          {currentTab === 'gmail' && <AdminGmailHub />}
          {currentTab === 'notifications' && <AdminNotifications />}
          {currentTab === 'audit' && <AdminAudit />}
          {currentTab === 'settings' && <AdminSettings />}
        </main>
      </div>
    </div>
  );
};
