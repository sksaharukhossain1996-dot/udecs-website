import React from 'react';
import { useStore } from '../../context/StoreContext';
import { BrandLogo } from '../common/BrandLogo';
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
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 pb-12 border-b border-white/10">
          {/* Brand Col */}
          <div className="md:col-span-4 space-y-4">
            <div className="flex items-center gap-3">
              <BrandLogo size="lg" textColor="text-white" subtextColor="text-[#CC9A2E]" />
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/10 text-[#CC9A2E] border border-white/15">
                {company.domain}
              </span>
            </div>

            <p className="text-xs text-[#B9BFAE] leading-relaxed">
              {company.legalName} — {siteContent?.footerAbout || company.description}
            </p>

            <div className="pt-2 text-[11px] space-y-1.5">
              <p className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#3C6656] shrink-0" />
                <span>{company.address}</span>
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
              <li>
                <a href="#kitchen" className="hover:text-white transition-colors">
                  Kitchenware & Home Cookware
                </a>
              </li>
              <li>
                <a href="#sports" className="hover:text-white transition-colors">
                  Sports, Weights & Fitness Gear
                </a>
              </li>
              <li>
                <a href="#wholesale" className="hover:text-[#CC9A2E] text-[#CC9A2E] font-medium transition-colors flex items-center gap-1">
                  <span>Wholesale B2B Cartons & Pallets</span>
                </a>
              </li>
              <li>
                <a href="#industrial" className="hover:text-white transition-colors">
                  Industrial Tools & Maintenance
                </a>
              </li>
              <li>
                <button
                  onClick={onOpenTracking}
                  className="hover:text-white transition-colors flex items-center gap-1.5"
                >
                  <Truck className="w-3.5 h-3.5 text-[#3C6656]" />
                  <span>Track Courier Shipment</span>
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
                <span>PayU India Gateway (UPI, Cards, NetBanking)</span>
              </li>
              <li className="flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5 text-[#3C6656]" />
                <span>Delhivery, Shiprocket & Blue Dart Surface</span>
              </li>
              <li className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-[#CC9A2E]" />
                <span>100% Tax Compliant GST Rule 46 Invoices</span>
              </li>
              <li className="flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-[#3C6656]" />
                <span>256-Bit SSL Encrypted Transactions</span>
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

        {/* Bottom Bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-white/60">
          <p>
            © {new Date().getFullYear()} {company.legalName}. All rights reserved. Registered under Indian GST Act.
          </p>
          <div className="flex items-center gap-4">
            <span className="font-mono">udecs.store</span>
            <span>·</span>
            <span>PayU Secured</span>
            <span>·</span>
            <span>WhatsApp AI Customer Care</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
