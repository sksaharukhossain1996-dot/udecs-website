import React, { useState } from 'react';
import { useStore } from '../../context/StoreContext';
import {
  Settings,
  CreditCard,
  Building,
  Save,
  CheckCircle,
  Database,
  RefreshCw,
  Lock,
  Share2,
} from 'lucide-react';

export const AdminSettings: React.FC = () => {
  const {
    company,
    payuConfig,
    updatePayUConfig,
    language,
    isOffline,
  } = useStore();

  const [payuState, setPayuState] = useState(payuConfig);
  const [isSaved, setIsSaved] = useState(false);

  const handleSavePayU = (e: React.FormEvent) => {
    e.preventDefault();
    updatePayUConfig(payuState);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const handleResetCache = () => {
    if (window.confirm('Reset local offline database cache and reload defaults?')) {
      localStorage.clear();
      window.location.reload();
    }
  };

  return (
    <div className="p-6 sm:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#CBCFB9]">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black font-heading text-[#0F1913]">
            {language === 'bn' ? 'সিস্টেম ও PayU পেমেন্ট গেটওয়ে সেটিংস' : 'System & PayU Gateway Configuration'}
          </h1>
          <p className="text-xs text-[#565F52] mt-0.5">
            Configure merchant API keys, company profile, domain bindings, and offline persistence.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono bg-[#E4E8D9] text-[#182620] px-2.5 py-1 rounded font-bold">
            Domain: {company.domain}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* PayU Payment Gateway Settings */}
        <div className="lg:col-span-6 bg-white p-5 rounded-lg border border-[#CBCFB9] shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-[#CBCFB9]">
            <CreditCard className="w-5 h-5 text-[#3C6656]" />
            <div>
              <h3 className="font-heading font-bold text-sm text-[#0F1913] uppercase tracking-wider">
                PayU India Gateway Credentials
              </h3>
              <p className="text-[11px] text-[#565F52]">
                Supports UPI (GPay, PhonePe), Credit/Debit Cards, Net Banking & Wallets
              </p>
            </div>
          </div>

          <form onSubmit={handleSavePayU} className="space-y-3.5 text-xs">
            <div>
              <label className="block font-bold text-[#0F1913] mb-1">
                Merchant Key (Merchant ID)
              </label>
              <input
                type="text"
                required
                value={payuState.merchantKey}
                onChange={(e) =>
                  setPayuState({ ...payuState, merchantKey: e.target.value })
                }
                className="w-full bg-[#FBFAF5] border border-[#CBCFB9] rounded p-2 text-[#0F1913] font-mono focus:outline-none focus:border-[#A87C1F]"
              />
            </div>

            <div>
              <label className="block font-bold text-[#0F1913] mb-1">
                Merchant Salt (Private Secret)
              </label>
              <input
                type="password"
                required
                value={payuState.merchantSalt}
                onChange={(e) =>
                  setPayuState({ ...payuState, merchantSalt: e.target.value })
                }
                className="w-full bg-[#FBFAF5] border border-[#CBCFB9] rounded p-2 text-[#0F1913] font-mono focus:outline-none focus:border-[#A87C1F]"
              />
            </div>

            <div className="pt-2 flex items-center justify-between p-3 rounded bg-[#FBFAF5] border border-[#CBCFB9]">
              <div>
                <span className="font-bold text-[#0F1913] block">Test Sandbox Mode</span>
                <span className="text-[10px] text-[#565F52]">
                  Simulate live customer transactions without charging bank accounts
                </span>
              </div>
              <input
                type="checkbox"
                checked={payuState.testMode}
                onChange={(e) =>
                  setPayuState({ ...payuState, testMode: e.target.checked })
                }
                className="w-4 h-4 accent-[#3C6656] cursor-pointer"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-[#0F1913] hover:bg-[#182620] text-white py-2.5 rounded font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
            >
              <Save className="w-4 h-4 text-[#CC9A2E]" />
              <span>{isSaved ? 'Credentials Saved!' : 'Save PayU Configuration'}</span>
            </button>
          </form>
        </div>

        {/* Company & Domain Verification */}
        <div className="lg:col-span-6 bg-white p-5 rounded-lg border border-[#CBCFB9] shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-[#CBCFB9]">
            <Building className="w-5 h-5 text-[#A87C1F]" />
            <div>
              <h3 className="font-heading font-bold text-sm text-[#0F1913] uppercase tracking-wider">
                Storefront & Legal Metadata
              </h3>
              <p className="text-[11px] text-[#565F52]">
                Registered under the Indian Central Goods and Services Tax Act, 2017
              </p>
            </div>
          </div>

          <div className="space-y-2.5 text-xs text-[#565F52]">
            <div className="flex justify-between py-1 border-b border-[#CBCFB9]/40">
              <span className="font-semibold">Company Legal Name:</span>
              <span className="font-bold text-[#0F1913]">{company.legalName}</span>
            </div>

            <div className="flex justify-between py-1 border-b border-[#CBCFB9]/40">
              <span className="font-semibold">Registered Owner:</span>
              <span className="font-bold text-[#0F1913]">SK Saharuk Hossain</span>
            </div>

            <div className="flex justify-between items-center py-1 border-b border-[#CBCFB9]/40">
              <div>
                <span className="font-semibold block">Admin 1 (Super Admin):</span>
                <span className="text-[10px] text-[#565F52]">Sign-in: <strong className="text-[#0F1913] font-mono">Google account</strong></span>
              </div>
              <span className="font-mono text-[#182620] font-bold text-right">sksaharukhossain1996@gmail.com</span>
            </div>

            <div className="flex justify-between items-center py-1 border-b border-[#CBCFB9]/40">
              <div>
                <span className="font-semibold block">Admin 2 (Executive):</span>
                <span className="text-[10px] text-[#565F52]">Sign-in: <strong className="text-[#0F1913] font-mono">Google account</strong></span>
              </div>
              <span className="font-mono text-[#182620] font-bold text-right">ecommerceunickdigital@gmail.com</span>
            </div>

            <div className="flex justify-between py-1 border-b border-[#CBCFB9]/40">
              <span className="font-semibold">Registered GSTIN:</span>
              <span className="font-mono font-bold text-[#0F1913]">{company.gstin}</span>
            </div>

            <div className="flex justify-between py-1 border-b border-[#CBCFB9]/40">
              <span className="font-semibold">Production Domain:</span>
              <span className="font-mono font-bold text-[#3C6656] flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                {company.domain}
              </span>
            </div>

            <div className="flex justify-between py-1 border-b border-[#CBCFB9]/40">
              <span className="font-semibold">Official WhatsApp:</span>
              <span className="font-mono">{company.whatsapp}</span>
            </div>

            <div className="flex justify-between py-1 border-b border-[#CBCFB9]/40">
              <span className="font-semibold">Registered Address:</span>
              <span className="text-[10.5px] text-right max-w-[220px] text-[#0F1913] font-medium">{company.address}</span>
            </div>

            <div className="flex justify-between py-1 border-b border-[#CBCFB9]/40">
              <span className="font-semibold">Gmail Support:</span>
              <span className="font-mono">{company.emailGmail}</span>
            </div>

            <div className="flex justify-between py-1 border-b border-[#CBCFB9]/40">
              <span className="font-semibold">Outlook Support:</span>
              <span className="font-mono">{company.emailOutlook}</span>
            </div>

            <div className="flex justify-between py-1 border-b border-[#CBCFB9]/40">
              <span className="font-semibold">Facebook:</span>
              <span className="font-mono text-[#0F1913]">{company.socialLinks.facebook}</span>
            </div>

            <div className="flex justify-between py-1 border-b border-[#CBCFB9]/40">
              <span className="font-semibold">Instagram:</span>
              <span className="font-mono text-[#0F1913]">{company.socialLinks.instagram}</span>
            </div>
          </div>

          {/* Offline Mode Cache Controls */}
          <div className="pt-3 border-t border-[#CBCFB9]">
            <h4 className="font-bold text-xs text-[#0F1913] uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-[#3C6656]" />
              <span>Offline Database & Sync Status</span>
            </h4>
            <p className="text-[11px] text-[#565F52] mb-3">
              Data is automatically indexed in local storage so orders, inventory updates, and HR attendance can be managed seamlessly even with low connectivity.
            </p>
            <button
              onClick={handleResetCache}
              className="w-full bg-[#FBFAF5] hover:bg-[#E4E8D9] text-red-800 border border-[#CBCFB9] py-2 rounded text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reset Local Cache & Re-seed Initial Store Data</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
