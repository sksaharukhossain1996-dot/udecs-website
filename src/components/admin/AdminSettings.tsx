import React from 'react';
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
    language,
    isOffline,
  } = useStore();

  return (
    <div className="udecs-settings p-6 sm:p-8 space-y-6 max-w-7xl mx-auto">
      <style>{`.udecs-settings{min-width:0;overflow-wrap:anywhere}.udecs-settings .grid>div{min-width:0}.udecs-settings .flex>span{min-width:0;overflow-wrap:anywhere}`}</style>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#CBCFB9]">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black font-heading text-[#0F1913]">
            {language === 'bn' ? 'সিস্টেম ও PayU পেমেন্ট গেটওয়ে সেটিংস' : 'System & PayU Gateway Configuration'}
          </h1>
          <p className="text-xs text-[#565F52] mt-0.5">
            Review company metadata and browser storage limits. Payment configuration is inactive.
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
                PayU integration - inactive
              </h3>
              <p className="text-[11px] text-[#565F52]">
                Supports UPI (GPay, PhonePe), Credit/Debit Cards, Net Banking & Wallets
              </p>
            </div>
          </div>

          <div role="status" className="space-y-3 text-sm border rounded p-4 bg-amber-50">
            <p>Customer PayU checkout is off. No payment gateway is configured by this panel.</p>
            <p>Do not enter a Merchant Salt here. Payment secrets belong in a protected server configuration, not browser storage.</p>
            <p>Existing browser settings are retained without being displayed or changed. Enabling payments needs a separate reviewed setup and verified checkout test.</p>
            <button type="button" disabled className="biz-btn opacity-60">Browser credential saving disabled</button>
          </div>
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
              disabled aria-disabled="true" title="Disabled: this would delete browser-only records"
              className="w-full bg-[#FBFAF5] hover:bg-[#E4E8D9] text-red-800 border border-[#CBCFB9] py-2 rounded text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reset disabled - protects browser-only data</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
