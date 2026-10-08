import {COMPANY_DETAILS} from '../../data/mockData';
import React from 'react';
import { useStore } from '../../context/StoreContext';
import {
  Phone,
  Mail,
  MapPin,
  ShieldCheck,
  CreditCard,
  Truck,
  Facebook,
  Instagram,
  Lock,
  ExternalLink,
} from 'lucide-react';

interface FooterProps {
  onOpenTracking: () => void;
  onOpenAdmin: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onOpenTracking, onOpenAdmin }) => {
  const { company, siteContent, language } = useStore();

  return (
    <footer className="bg-[#0F1913] text-[#B9BFAE] border-t border-[#CBCFB9]/30 pt-16 pb-12 text-xs">
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6">
        <style>{`.visual-store .udecs-invest-entry h3 { color: #fff !important; } .visual-store .udecs-invest-entry a, .visual-store .udecs-invest-entry a svg { color: #17385b !important; }`}</style>
        <section aria-labelledby="invest-in-udecs" className="udecs-invest-entry mb-10 rounded-xl border border-white/30 bg-white/10 p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div><h3 id="invest-in-udecs" className="text-xl font-bold text-white">Invest in UDECS</h3><p className="mt-2 text-sm text-white/90">Interested in investing or partnering with UDECS? Send an investment inquiry. Open to all visitors, no login needed.</p></div>
          <a href="/invest.html" className="shrink-0 inline-flex items-center justify-center rounded-lg bg-[#F7941D] px-5 py-3 text-sm font-bold text-[#17385B] hover:bg-[#FFAD49]">Apply as an investor <ExternalLink className="ml-2 h-4 w-4" /></a>
        </section>
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 pb-12 border-b border-white/10">
          {/* Brand Col */}
          <div className="md:col-span-4 space-y-4">
            <div className="flex items-center gap-3">
              <div className="shrink-0 rounded-2xl border border-white/80 bg-white p-3 shadow-lg">
                <img
                  src="/UDECS_Logo_Premium_Transparent.png"
                  alt="UDECS Commerce Solutions"
                  width={997}
                  height={958}
                  className="block h-auto w-[148px] sm:w-[168px] max-w-full object-contain"
                  loading="eager"
                  decoding="async"
                />
              </div>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/10 text-[#CC9A2E] border border-white/15">
                {company.domain}
              </span>
            </div>

            <p className="text-xs text-[#B9BFAE] leading-relaxed">
              {COMPANY_DETAILS.name} — {siteContent?.footerAbout || company.description}
            </p>

            <div className="pt-2 text-[11px] space-y-1.5">
              <p className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#3C6656] shrink-0" />
                <span>{COMPANY_DETAILS.address}</span>
              </p>
            </div>

            {/* Social Media Links: Facebook & Instagram as requested */}
            <div className="pt-3">
              <span className="text-[11px] uppercase tracking-wider font-semibold text-white/80 block mb-2">
                Connect With Us
              </span>
              <div className="flex items-center gap-3">
                <a
                  href={company.socialLinks?.facebook || company.socials?.facebook || 'https://facebook.com'}
                  target="_blank"
                  rel="noreferrer"
                  className="w-8 h-8 rounded bg-white/10 hover:bg-[#1877F2] text-white flex items-center justify-center transition-colors"
                  title="Facebook - UNICK DIGITAL"
                >
                  <Facebook className="w-4 h-4" />
                </a>
                <a
                  href={company.socialLinks?.instagram || company.socials?.instagram || 'https://instagram.com'}
                  target="_blank"
                  rel="noreferrer"
                  className="w-8 h-8 rounded bg-white/10 hover:bg-gradient-to-tr hover:from-[#F58529] hover:via-[#DD2A7B] hover:to-[#8134AF] text-white flex items-center justify-center transition-colors"
                  title="Instagram - @udecs.store"
                >
                  <Instagram className="w-4 h-4" />
                </a>
                <a
                  href={`https://wa.me/${company.whatsapp.replace(/[^0-9]/g, '')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="w-8 h-8 rounded bg-white/10 hover:bg-[#25D366] text-white flex items-center justify-center transition-colors"
                  title="WhatsApp Business Hotline"
                >
                  <Phone className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div className="md:col-span-3 space-y-3">
            <h4 className="font-heading font-bold text-white text-sm uppercase tracking-wider">
              Catalogs & Sourcing
            </h4>
            <ul className="space-y-2 text-xs">
              <li><a href="/?customer-portal" className="hover:text-white">Customer sign up / log in</a></li>
              <li>
                <a href="#products?category=kitchen" className="hover:text-white transition-colors">
                  Kitchenware & Home Cookware
                </a>
              </li>
              <li>
                <a href="#products?category=sports" className="hover:text-white transition-colors">
                  Sports, Weights & Fitness Gear
                </a>
              </li>
              <li>
                <a href="#wholesale" className="hover:text-[#CC9A2E] text-[#CC9A2E] font-medium transition-colors flex items-center gap-1">
                  <span>Wholesale B2B Cartons & Pallets</span>
                </a>
              </li>
              <li>
                <a href="#products?category=industrial" className="hover:text-white transition-colors">
                  Industrial Tools & Maintenance
                </a>
              </li>
              <li>
                <button
                  onClick={onOpenTracking}
                  className="hover:text-white transition-colors flex items-center gap-1.5"
                >
                  <Truck className="w-3.5 h-3.5 text-[#3C6656]" />
                  <span>Order status support</span>
                </button>
              </li>
            </ul>
          </div>

          {/* Logistics & Payment */}
          <div className="md:col-span-3 space-y-3">
            <h4 className="font-heading font-bold text-white text-sm uppercase tracking-wider">
              Payments & Logistics
            </h4>
            <ul className="space-y-2 text-xs">
              <li className="flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-[#CC9A2E]" />
                <span>UPI payment details shared with order confirmation</span>
              </li>
              <li className="flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5 text-[#3C6656]" />
                <span>Shipping availability and charges confirmed before dispatch</span>
              </li>
              <li className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-[#CC9A2E]" />
                <span>GSTIN: 19AODPH1519N1ZS · Invoice details confirmed with your order</span>
              </li>
              <li className="flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-[#3C6656]" />
                <span>Secure HTTPS connection</span>
              </li>
            </ul>

            <div className="pt-2">
              <button
                onClick={onOpenAdmin}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-white/10 hover:bg-[#CC9A2E] hover:text-[#0F1913] text-white font-semibold transition-colors"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Staff & Management Portal</span>
              </button>
            </div>
          </div>

          {/* Contact Details */}
          <div className="md:col-span-2 space-y-3">
            <h4 className="font-heading font-bold text-white text-sm uppercase tracking-wider">
              Official Contact
            </h4>
            <div className="space-y-2 text-xs">
              <a
                href={`https://wa.me/${company.whatsapp.replace(/[^0-9]/g, '')}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 hover:text-white transition-colors"
              >
                <Phone className="w-3.5 h-3.5 text-[#25D366]" />
                <span>{company.whatsapp}</span>
              </a>

              <a
                href={`mailto:${company.emailGmail}`}
                className="flex items-center gap-1.5 hover:text-white transition-colors break-all"
              >
                <Mail className="w-3.5 h-3.5 text-[#CC9A2E]" />
                <span>{company.emailGmail}</span>
              </a>

              <a
                href={`mailto:${company.emailOutlook}`}
                className="flex items-center gap-1.5 hover:text-white transition-colors break-all"
              >
                <Mail className="w-3.5 h-3.5 text-[#3C6656]" />
                <span>{company.emailOutlook}</span>
              </a>

              <div className="pt-1 text-[11px] text-[#B9BFAE]">
                Domain: <b className="text-white font-mono">{company.domain}</b>
              </div>
            </div>
          </div>
        </div>

        <nav aria-label="Website policies" className="pt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm text-white">
          <a href="/b2b.html" className="text-xs underline">B2B wholesale</a>
<a className="hover:underline" href="/payment-policy.html">Payment policy</a>
          <a className="hover:underline" href="/return-refund-policy.html">Return and refund policy</a>
          <a className="hover:underline" href="/shipping-policy.html">Shipping policy</a>
          <a className="hover:underline" href="/terms-and-conditions.html">Terms and conditions</a>
        </nav>

        {/* Bottom Bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-white/60">
          <p>
            © {new Date().getFullYear()} {COMPANY_DETAILS.name}. All rights reserved. Registered under Indian GST Act.
          </p>
          <div className="flex items-center gap-4">
            <span className="font-mono">udecs.store</span>
            <span>·</span>
            <span>UPI payment details · COD paused</span>
            <span>·</span>
            <span>WhatsApp customer support</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
