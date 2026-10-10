import {ListImport} from '../../import-stage/ListImport';
import "../../import-stage/import.css";
import {ManagementBackContext, BackButton, type LocalBack} from '../../navigation/ManagementBack';
import {visit,previous} from '../../navigation/backHistory';
import {AdminAgentHub} from './AdminAgentHub';
import {AdminSoftwareHealth} from './AdminSoftwareHealth';
import { googleSignInHelp, requiresExternalGoogleBrowser, STAFF_SIGN_IN_URL } from '../../firebase/googleSignInEnvironment';
import {AdminERP} from '../../business/AdminERP';
import {CUSTOMER_SUPPORT_ENABLED} from '../../customer-stage/featureFlags';
import {CustomerPortalTab} from '../../customer-stage/CustomerPortalTab';
import {AdminCRM} from '../../business/AdminCRM';
import '../../business/business.css';
import React, { useState, useCallback, useRef } from 'react';
import { useStore } from '../../context/StoreContext';
import { AdminSidebar, AdminTab } from './AdminSidebar';
import { AdminOverview } from './AdminOverview';
import {AdminQuotation} from '../../quotation/AdminQuotation';
import { AdminRfqInbox } from './AdminRfqInbox';
import { AdminOrders } from './AdminOrders';
import {AdminProductListings} from './AdminProductListings';
import { StockUpdate } from '../../stock-stage/StockUpdate';
import { AdminInventory } from './AdminInventory';
import { AdminGstReports } from './AdminGstReports';
import { AdminInvestors } from './AdminInvestors';
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
    products,
    language,
    isFirebaseConnected,
    firebaseUser,
    signInWithGoogleAuth,
    signOutFirebaseAuth,
  } = useStore();
  const [navigation, setNavigation] = useState({current: 'overview' as AdminTab, history: [] as AdminTab[]});
  const currentTab = navigation.current;
  const [quotationSeed,setQuotationSeed]=useState<any>(null);
  const [localBack, setLocalBack] = useState<LocalBack[]>([]);
  const dirty = useRef(false);
  const registerBack = useCallback((entry: LocalBack) => { setLocalBack(x => [...x, entry]); return () => setLocalBack(x => x.filter(y => y !== entry)); }, []);
  const allowLeave = () => !dirty.current || window.confirm('Leave this page? Unsaved changes will not be saved.');
  const setCurrentTab = (tab: AdminTab) => { if(tab === currentTab || !allowLeave()) return; dirty.current = false; setNavigation(x => visit(x,tab)); };
  const goBack = () => { if(localBack.length) { localBack.at(-1)!.run(); return; } if(!allowLeave()) return; dirty.current=false; setNavigation(x => previous(x,'overview')); };


  const [loginError, setLoginError] = useState('');
  const [isGoogleSigningIn, setIsGoogleSigningIn] = useState(false);
  const needsBrowser = requiresExternalGoogleBrowser(navigator.userAgent, location.protocol, location.hostname);

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    setIsGoogleSigningIn(true);
    setLoginError('');
    try {
      await signInWithGoogleAuth();
    } catch (err: any) {
      setLoginError(googleSignInHelp(err));
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

          <BackButton onClick={onClose} label="Back to storefront"/>
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
            {needsBrowser && <div role="status" className="p-3 rounded bg-amber-50 text-amber-900 text-sm">Google login ke liye Chrome ya apna normal browser kholo. WhatsApp mein menu se "Open in browser" chuno. <a className="underline block mt-2 break-all" href={STAFF_SIGN_IN_URL} target="_blank" rel="noopener noreferrer">{STAFF_SIGN_IN_URL}</a><p className="mt-2">Agar link yahin khule, address copy karke Chrome mein paste karo.</p></div>}
            {loginError && (
              <div className="p-2.5 rounded bg-red-100 text-red-800 text-xs font-semibold">
                {loginError}
              </div>
            )}

            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isGoogleSigningIn || needsBrowser}
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
              <span>{needsBrowser ? 'Open in your browser for Google sign-in' : isGoogleSigningIn ? 'Connecting to Google...' : 'Sign in with Google (Firebase)'}</span>
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
    <ManagementBackContext.Provider value={registerBack}><div className="premium-admin fixed inset-0 z-50 bg-[#F4F6EE] flex overflow-hidden animate-fadeIn">
      {/* Sidebar */}
      <AdminSidebar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        onExitAdmin={() => { if(allowLeave()) onClose(); }}
      />

      {/* Main Content Area with Executive Top Bar */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Executive Top Navigation Bar */}
        <header className="admin-topbar bg-white border-b border-[#CBCFB9] px-4 sm:px-6 py-2.5 flex items-center justify-between shrink-0 shadow-xs gap-3">
          {/* Left: Domain Indicator & Tab Shortcuts */}
          <div className="flex items-center gap-2.5 min-w-0"><BackButton onClick={goBack} label={localBack.at(-1)?.label || (navigation.history.length ? 'Back to previous page' : 'Back to Dashboard')}/>
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
              onClick={() => { if(allowLeave()) onClose(); }}
              className="text-xs text-[#565F52] hover:text-[#0F1913] p-1.5 rounded hover:bg-slate-100 flex items-center gap-1"
              title="Return to Storefront"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Storefront</span>
            </button>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="admin-content flex-1 overflow-y-auto relative"><style>{`.portal-watermark{position:sticky;top:0;height:0;width:100%;z-index:20;pointer-events:none;user-select:none}.portal-watermark img{position:absolute;top:18vh;right:8%;width:min(54vw,520px);height:auto;opacity:.055;pointer-events:none}@media(max-width:640px){.portal-watermark img{top:24vh;right:5%;width:90%;opacity:.045}}@media print{.portal-watermark{display:none}}`}</style><div aria-hidden="true" className="portal-watermark"><img src="/UDECS_Logo_Premium_Transparent.png" alt="" draggable={false}/></div><div className="admin-module" onChangeCapture={e => { const target = e.target as HTMLElement; if(currentTab !== 'b2b_quotation' && target.closest('form')) dirty.current=true; }}>
          <ListImport key={currentTab} tab={currentTab}/>{currentTab === 'overview' && (
            <AdminOverview onNavigate={(tab) => setCurrentTab(tab)} />
          )}
          {currentTab === 'website_control' && <AdminWebsiteControl />}
          {currentTab === 'whatsapp_automation' && <AdminWhatsAppAutomation />}
          {currentTab === 'orders' && <AdminOrders />}
          {currentTab === 'b2b_quotation' && <AdminQuotation onDirtyChange={value=>{dirty.current=value}} seed={quotationSeed} onSeedUsed={()=>setQuotationSeed(null)}/>}
          {currentTab === 'rfq' && <AdminRfqInbox onCreateQuotation={row=>{if(!allowLeave())return;setQuotationSeed(row);setCurrentTab('b2b_quotation')}} />}
          {CUSTOMER_SUPPORT_ENABLED && currentTab === 'customers' && <CustomerPortalTab enabled/>}
          {currentTab === 'product_listing' && <AdminProductListings />}
          {currentTab === 'stock_update' && <StockUpdate products={products} company={company}/> }
          {currentTab === 'inventory' && <AdminInventory />}
          {currentTab === 'gst' && <AdminGstReports />}
          {currentTab === 'investors' && <AdminInvestors />}
          {currentTab==='erp' && <AdminERP/>}
            {currentTab === 'crm' && <AdminCRM />}
          {currentTab === 'hr' && <AdminHR />}
          {currentTab === 'collaboration' && <AdminCollaboration />}
          {currentTab === 'gmail' && <AdminGmailHub />}
          {currentTab === 'notifications' && <AdminNotifications />}
          {currentTab === 'ai_agent_hub' && <AdminAgentHub />}
          {currentTab === 'software_health' && <AdminSoftwareHealth />}
          {currentTab === 'audit' && <AdminAudit />}
          {currentTab === 'settings' && <AdminSettings />}
        </div></main>
      </div>
    </div></ManagementBackContext.Provider>
  );
};
