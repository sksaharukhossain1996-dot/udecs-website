import React, { useState, useEffect } from 'react';
import { useStore, CURRENCY_INFO } from '../../context/StoreContext';
import { Language, Currency } from '../../types';
import { BrandLogo } from '../common/BrandLogo';
import {
  Search,
  ShoppingBag,
  Menu,
  X,
  Truck,
  Globe,
  LayoutDashboard,
  Phone,
  ShieldCheck,
  Mic,
  Sparkles,
} from 'lucide-react';

interface NavbarProps {
  onOpenCart: () => void;
  onOpenTracking: () => void;
  onOpenSearch: () => void;
  onOpenAdmin: () => void;
  onOpenVoice: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenCart,
  onOpenTracking,
  onOpenSearch,
  onOpenAdmin,
  onOpenVoice,
}) => {
  const {
    company,
    siteContent,
    cartCount,
    language,
    setLanguage,
    currency,
    setCurrency,
    t,
    isOffline,
  } = useStore();

  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      {/* Top Announcement Bar */}
      {siteContent?.announcement && (
        <div className="bg-[#182620] text-[#FBFAF5] text-[11px] sm:text-xs py-1.5 px-4 text-center border-b border-black/20 flex items-center justify-center gap-2 font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-[#25D366] animate-pulse"></span>
          <span>{siteContent.announcement}</span>
        </div>
      )}

      {/* Offline Alert Banner if network goes down */}
      {isOffline && (
        <div className="bg-[#182620] text-[#CC9A2E] text-xs py-1.5 px-4 text-center font-medium flex items-center justify-center gap-2 border-b border-[#CC9A2E]/30">
          <span className="w-2 h-2 rounded-full bg-[#CC9A2E] animate-pulse"></span>
          <span>
            Offline Mode Active: Local cache enabled. Changes will automatically sync once connection restores.
          </span>
        </div>
      )}

      <header
        className={`sticky top-0 z-40 bg-[#EEF0E7]/95 backdrop-blur-md border-b border-[#CBCFB9] transition-all duration-200 ${
          isScrolled ? 'py-2 shadow-xs' : 'py-3'
        }`}
      >
        <div className="max-w-[1240px] mx-auto px-4 sm:px-6 flex items-center justify-between gap-3">
          {/* Logo with User's Transparent Logo Emblem */}
          <div className="flex items-center gap-3">
            <a href="#top" className="flex items-center gap-2 group">
              <BrandLogo size="md" />
              <span className="hidden sm:inline-block text-[11px] font-mono px-1.5 py-0.5 rounded bg-[#E4E8D9] text-[#565F52] border border-[#CBCFB9]">
                {company.domain}
              </span>
            </a>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-6 text-[14.5px] font-medium text-[#565F52]">
            <a
              href="#kitchen"
              className="hover:text-[#0F1913] hover:border-b-2 hover:border-[#CC9A2E] py-1 transition-colors"
            >
              {t('kitchenNav')}
            </a>
            <a
              href="#sports"
              className="hover:text-[#0F1913] hover:border-b-2 hover:border-[#CC9A2E] py-1 transition-colors"
            >
              {t('sportsNav')}
            </a>
            <a
              href="#wholesale"
              className="hover:text-[#0F1913] hover:border-b-2 hover:border-[#CC9A2E] py-1 transition-colors flex items-center gap-1 text-[#3C6656] font-semibold"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#A87C1F]"></span>
              {t('wholesaleNav')}
            </a>
            <a
              href="#industrial"
              className="hover:text-[#0F1913] hover:border-b-2 hover:border-[#CC9A2E] py-1 transition-colors"
            >
              {t('industrialNav')}
            </a>
            <button
              onClick={onOpenTracking}
              className="hover:text-[#0F1913] py-1 transition-colors flex items-center gap-1.5 text-xs bg-[#FBFAF5] border border-[#CBCFB9] px-2.5 py-1 rounded hover:border-[#9CA48A]"
            >
              <Truck className="w-3.5 h-3.5 text-[#A87C1F]" />
              <span>{t('trackNav')}</span>
            </button>
          </nav>

          {/* Header Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Search Trigger */}
            <button
              onClick={onOpenSearch}
              aria-label="Search products"
              className="p-2 text-[#182620] hover:bg-[#E4E8D9] rounded transition-colors"
              title="Search catalog"
            >
              <Search className="w-4.5 h-4.5" />
            </button>

            {/* Currency Selector (Clean dropdown without clutter) */}
            <div className="relative">
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value as Currency)}
                className="text-xs font-semibold bg-[#FBFAF5] border border-[#CBCFB9] rounded px-2 py-1 text-[#182620] focus:outline-none focus:border-[#A87C1F] cursor-pointer"
                title="Change currency"
              >
                {Object.keys(CURRENCY_INFO).map((curr) => (
                  <option key={curr} value={curr}>
                    {curr} ({CURRENCY_INFO[curr].symbol.trim()})
                  </option>
                ))}
              </select>
            </div>

            {/* Language Selector */}
            <div className="flex items-center text-xs bg-[#FBFAF5] border border-[#CBCFB9] rounded p-0.5">
              <button
                onClick={() => setLanguage('bn')}
                className={`px-1.5 py-0.5 rounded text-[11px] font-medium transition-colors ${
                  language === 'bn'
                    ? 'bg-[#182620] text-white'
                    : 'text-[#565F52] hover:text-[#182620]'
                }`}
                title="বাংলা"
              >
                বাং
              </button>
              <button
                onClick={() => setLanguage('en')}
                className={`px-1.5 py-0.5 rounded text-[11px] font-medium transition-colors ${
                  language === 'en'
                    ? 'bg-[#182620] text-white'
                    : 'text-[#565F52] hover:text-[#182620]'
                }`}
                title="English"
              >
                EN
              </button>
              <button
                onClick={() => setLanguage('hi')}
                className={`px-1.5 py-0.5 rounded text-[11px] font-medium transition-colors ${
                  language === 'hi'
                    ? 'bg-[#182620] text-white'
                    : 'text-[#565F52] hover:text-[#182620]'
                }`}
                title="हिन्दी"
              >
                हि
              </button>
            </div>

            {/* Cart Button */}
            <button
              onClick={onOpenCart}
              aria-label="View shopping cart"
              className="relative p-2 text-[#182620] hover:bg-[#E4E8D9] rounded transition-colors"
            >
              <ShoppingBag className="w-5 h-5" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-[#A87C1F] text-white text-[10px] font-bold min-w-4 h-4 px-1 rounded-full flex items-center justify-center animate-scaleIn">
                  {cartCount}
                </span>
              )}
            </button>

            {/* Live Voice Assistant */}
            <button
              onClick={onOpenVoice}
              className="flex items-center gap-1.5 text-xs font-semibold bg-[#E8730A] hover:bg-[#D06505] text-white px-2.5 py-1.5 rounded transition-all shadow-xs"
              title="Live Voice AI"
            >
              <Mic className="w-3.5 h-3.5 text-amber-200 animate-pulse" />
              <span className="hidden sm:inline">Live Voice</span>
            </button>

            {/* Admin & Staff Portal Button */}
            <button
              onClick={onOpenAdmin}
              className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold bg-[#182620] hover:bg-[#0F1913] text-white px-3 py-1.5 rounded transition-all shadow-xs"
            >
              <LayoutDashboard className="w-3.5 h-3.5 text-[#CC9A2E]" />
              <span>{t('dashboardNav')}</span>
            </button>

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 text-[#182620] hover:bg-[#E4E8D9] rounded"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden fixed inset-x-0 top-full bg-[#FBFAF5] border-b border-[#CBCFB9] shadow-lg p-5 flex flex-col gap-3 animate-fadeIn">
            <a
              href="#kitchen"
              onClick={() => setMobileMenuOpen(false)}
              className="py-2 border-b border-[#E4E8D9] text-[#182620] font-medium"
            >
              {t('kitchenNav')}
            </a>
            <a
              href="#sports"
              onClick={() => setMobileMenuOpen(false)}
              className="py-2 border-b border-[#E4E8D9] text-[#182620] font-medium"
            >
              {t('sportsNav')}
            </a>
            <a
              href="#wholesale"
              onClick={() => setMobileMenuOpen(false)}
              className="py-2 border-b border-[#E4E8D9] text-[#3C6656] font-semibold flex items-center justify-between"
            >
              <span>{t('wholesaleNav')}</span>
              <span className="text-[10px] bg-[#CC9A2E]/20 text-[#A87C1F] px-2 py-0.5 rounded font-mono">B2B</span>
            </a>
            <a
              href="#industrial"
              onClick={() => setMobileMenuOpen(false)}
              className="py-2 border-b border-[#E4E8D9] text-[#182620] font-medium"
            >
              {t('industrialNav')}
            </a>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenTracking();
              }}
              className="py-2.5 text-left flex items-center gap-2 text-[#182620] font-medium"
            >
              <Truck className="w-4 h-4 text-[#A87C1F]" />
              <span>{t('trackNav')}</span>
            </button>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenVoice();
              }}
              className="mt-2 w-full flex items-center justify-center gap-2 bg-[#E8730A] text-white py-2.5 rounded font-semibold text-sm shadow-xs"
            >
              <Mic className="w-4 h-4 text-amber-200 animate-pulse" />
              <span>Live Voice AI</span>
            </button>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenAdmin();
              }}
              className="w-full flex items-center justify-center gap-2 bg-[#182620] text-white py-2.5 rounded font-semibold text-sm"
            >
              <LayoutDashboard className="w-4 h-4 text-[#CC9A2E]" />
              <span>{t('dashboardNav')}</span>
            </button>
            <div className="pt-3 border-t border-[#E4E8D9] text-xs text-[#565F52] flex flex-col gap-1">
              <p className="flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-[#3C6656]" />
                WhatsApp: {company.whatsapp}
              </p>
            </div>
          </div>
        )}
      </header>
    </>
  );
};
