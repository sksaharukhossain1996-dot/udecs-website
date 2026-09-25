import React, { useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { getApiUrl } from '../../services/api';
import { Product } from '../../types';
import { ProductIcon } from '../common/ProductIcon';
import {
  Globe,
  Link as LinkIcon,
  Phone,
  Mail,
  Building,
  ShieldCheck,
  Save,
  CheckCircle,
  Copy,
  ExternalLink,
  Plus,
  Trash2,
  Edit,
  Sparkles,
  ShoppingBag,
  Share2,
  Eye,
  Instagram,
  Facebook,
  Search,
  Check,
  RefreshCw,
  MessageSquare,
  KeyRound,
  Lock,
  UserCheck,
  Shield,
  CheckCircle2,
  AlertCircle,
  ArrowRightLeft,
  Server,
  Zap,
  EyeOff,
} from 'lucide-react';
import { AdminWhatsAppAutomation } from './AdminWhatsAppAutomation';

export const AdminWebsiteControl: React.FC = () => {
  const {
    company,
    updateCompany,
    siteContent,
    updateSiteContent,
    products,
    addProduct,
    updateProduct,
    deleteProduct,
    formatPrice,
    addAuditLog,
    currentUser,
    login,
  } = useStore();

  const [activeSubTab, setActiveSubTab] = useState<'domain_admin' | 'selling' | 'whatsapp' | 'texts' | 'contacts' | 'products'>('domain_admin');
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  // --- Sub-Tab 0: Domain & Admin Setup State ---
  const [showAdmin1Pass, setShowAdmin1Pass] = useState(false);
  const [showAdmin2Pass, setShowAdmin2Pass] = useState(false);
  const [isCheckingDomain, setIsCheckingDomain] = useState(false);
  const [activeDnsMethod, setActiveDnsMethod] = useState<'cloud' | 'github'>('cloud');
  const [domainCheckResult, setDomainCheckResult] = useState<{
    status: string;
    isLive: boolean;
    latency: string;
    ssl: string;
    edge: string;
    registrar: string;
    aRecords: string[];
    cnameRecords: string[];
    nameservers: string[];
    timestamp: string;
  } | null>(null);

  // Quick Credential Tester State
  const [testEmail, setTestEmail] = useState('sksaharukhossain1996@gmail.com');
  const [testPass, setTestPass] = useState('');
  const [testAuthStatus, setTestAuthStatus] = useState<{ success?: boolean; message?: string } | null>(null);

  // --- Sub-Tab 1: Quick Online Selling via Link State ---
  const [pastedUrl, setPastedUrl] = useState('');
  const [sellingForm, setSellingForm] = useState({
    name: '',
    category: 'kitchen' as 'kitchen' | 'sports' | 'wholesale' | 'industrial',
    sku: `UDECS-${Math.floor(100 + Math.random() * 900)}`,
    hsn: '73239390',
    price: 1299,
    wholesalePrice: 850,
    minWholesaleQty: 10,
    stock: 50,
    minStockAlert: 8,
    gstRate: 18,
    description: '',
    imageUrl: '',
    imageIcon: 'i-pot',
    productLink: '',
  });

  const showToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3500);
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedLink(label);
    showToast(`Copied ${label} to clipboard!`);
    setTimeout(() => setCopiedLink(null), 2500);
  };

  const handleRunDomainCheck = async () => {
    setIsCheckingDomain(true);
    setDomainCheckResult(null);
    try {
      const res = await fetch(getApiUrl('/api/domain/live-status'));
      if (!res.ok) throw new Error(`Diagnostics API responded with status ${res.status}`);
      const data = await res.json();
      setDomainCheckResult({
        status: `${data.httpStatus || 'Unavailable'} (${data.isLive ? 'Domain live' : 'Domain check failed'})`,
        isLive: Boolean(data.isLive),
        latency: typeof data.latencyMs === 'number' ? `${data.latencyMs} ms` : 'Unavailable',
        ssl: data.sslStatus || 'Unavailable',
        edge: data.currentRouting || 'Unavailable',
        registrar: data.registrar || 'Unavailable',
        aRecords: data.aRecords || [],
        cnameRecords: data.cnameRecords || [],
        nameservers: data.nameservers || [],
        timestamp: new Date().toLocaleTimeString(),
      });
      if (!data.isLive) throw new Error(data.errorMessage || 'Domain check failed.');
      showToast('Real-time DNS & Edge check completed.');
      addAuditLog({
        action: 'DOMAIN_HEALTH_CHECK',
        module: 'Website Settings',
        details: `Live DNS checked: ${data.registrar || 'unknown'}, A: ${data.aRecords?.join(', ') || 'none'}`,
      });
    } catch (err) {
      setDomainCheckResult({
        status: 'Unavailable',
        isLive: false,
        latency: 'Unavailable',
        ssl: 'Unavailable',
        edge: 'Unavailable',
        registrar: 'Unavailable',
        aRecords: [],
        cnameRecords: [],
        nameservers: [],
        timestamp: new Date().toLocaleTimeString(),
      });
      showToast(err instanceof Error ? err.message : 'Domain diagnostics are unavailable.');
    } finally {
      setIsCheckingDomain(false);
    }
  };

  const handleTestAuth = (e: React.FormEvent) => {
    e.preventDefault();
    const success = login(testEmail, testPass);
    if (success) {
      const isSuperAdmin = testEmail.toLowerCase() === 'sksaharukhossain1996@gmail.com';
      const roleName = isSuperAdmin
        ? 'Admin 1 (Super Admin / SK Saharuk Hossain)'
        : 'Admin 2 (Executive Admin / UNICK DIGITAL)';
      setTestAuthStatus({
        success: true,
        message: `Success! Valid credentials for ${roleName}. User session active for udecs.store.`,
      });
      showToast(`Authenticated successfully as ${testEmail}!`);
    } else {
      setTestAuthStatus({
        success: false,
        message: 'Authentication failed. Please verify user id and password.',
      });
    }
  };

  // Auto-parse product link when user pastes a link
  const handleParseProductLink = (urlToParse?: string) => {
    const url = (urlToParse || pastedUrl).trim();
    if (!url) return;

    let guessedName = '';
    let guessedCategory: 'kitchen' | 'sports' | 'wholesale' | 'industrial' = 'kitchen';
    let guessedIcon = 'i-pot';

    // Parse URL slug
    try {
      const parsed = new URL(url);
      const pathname = parsed.pathname.toLowerCase();

      // Guess category from keywords
      if (pathname.includes('cook') || pathname.includes('kitchen') || pathname.includes('pan') || pathname.includes('pot') || pathname.includes('blender') || pathname.includes('kettle')) {
        guessedCategory = 'kitchen';
        guessedIcon = 'i-pot';
      } else if (pathname.includes('sport') || pathname.includes('fitness') || pathname.includes('gym') || pathname.includes('dumbbell') || pathname.includes('yoga') || pathname.includes('racket') || pathname.includes('ball')) {
        guessedCategory = 'sports';
        guessedIcon = 'i-dumbbell';
      } else if (pathname.includes('wholesale') || pathname.includes('bulk') || pathname.includes('pallet') || pathname.includes('crate') || pathname.includes('lot')) {
        guessedCategory = 'wholesale';
        guessedIcon = 'i-crate';
      } else if (pathname.includes('tool') || pathname.includes('drill') || pathname.includes('screw') || pathname.includes('industrial') || pathname.includes('hardware')) {
        guessedCategory = 'industrial';
        guessedIcon = 'i-wrench';
      }

      // Try extracting human-readable title from path slug
      const segments = pathname.split('/').filter(Boolean);
      const lastSegment = segments[segments.length - 1] || segments[0] || '';
      const cleanSlug = lastSegment
        .replace(/(\.html|\.php|\.aspx|\?.*)$/, '')
        .replace(/[-_]+/g, ' ')
        .trim();

      if (cleanSlug && cleanSlug.length > 3 && !cleanSlug.match(/^[a-z0-9]{15,}$/i)) {
        guessedName = cleanSlug
          .split(' ')
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ')
          .slice(0, 60);
      }
    } catch {
      // not a strict URL format, keep going
    }

    const newSku = `UDECS-${guessedCategory.slice(0, 2).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;

    setSellingForm((prev) => ({
      ...prev,
      name: guessedName || prev.name || 'Direct Sourced Premium Product',
      category: guessedCategory,
      imageIcon: guessedIcon,
      sku: newSku,
      productLink: url,
      description: prev.description || `Directly sourced official product supplied by UNICK DIGITAL E-COMMERCE SOLUTIONS. Genuine quality with GST tax invoice.`,
    }));

    showToast('Product link analyzed! You can now adjust details & publish.');
  };

  const handlePublishProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sellingForm.name) {
      alert('Please enter a product name');
      return;
    }

    const newProduct: Omit<Product, 'id'> = {
      name: sellingForm.name,
      nameBn: sellingForm.name,
      nameHi: sellingForm.name,
      category: sellingForm.category,
      sku: sellingForm.sku || `UDECS-${Math.floor(1000 + Math.random() * 9000)}`,
      hsn: sellingForm.hsn || '73239390',
      price: Number(sellingForm.price) || 999,
      wholesalePrice: Number(sellingForm.wholesalePrice) || Math.round(Number(sellingForm.price) * 0.7),
      minWholesaleQty: Number(sellingForm.minWholesaleQty) || 10,
      stock: Number(sellingForm.stock) || 30,
      minStockAlert: Number(sellingForm.minStockAlert) || 5,
      rating: 4.9,
      reviewsCount: 1,
      imageIcon: sellingForm.imageIcon,
      imageUrl: sellingForm.imageUrl.trim() || undefined,
      productLink: sellingForm.productLink.trim() || pastedUrl.trim() || undefined,
      description: sellingForm.description || 'Premium commercial quality with Pan-India dispatch.',
      descriptionBn: sellingForm.description || 'প্রিমিয়াম কোয়ালিটি ও দ্রুত ডেলিভারি সুবিধা।',
      gstRate: Number(sellingForm.gstRate) || 18,
      featured: true,
    };

    addProduct(newProduct);
    showToast(`Successfully published "${sellingForm.name}" to online store!`);

    // Reset URL
    setPastedUrl('');
  };

  // --- Sub-Tab 2: Website Texts CMS State ---
  const [textsForm, setTextsForm] = useState({
    announcement: siteContent?.announcement || '',
    heroBadge: siteContent?.heroBadge || '',
    heroHeadline: siteContent?.heroHeadline || '',
    heroHeadlineHighlight: siteContent?.heroHeadlineHighlight || '',
    heroSubheadline: siteContent?.heroSubheadline || '',
    heroCtaButton: siteContent?.heroCtaButton || '',
    heroSecondaryButton: siteContent?.heroSecondaryButton || '',
    statProducts: siteContent?.statProducts || '',
    statExperience: siteContent?.statExperience || '',
    statClients: siteContent?.statClients || '',
    statDistricts: siteContent?.statDistricts || '',
    categoryHeadline: siteContent?.categoryHeadline || '',
    categorySubheadline: siteContent?.categorySubheadline || '',
    wholesaleHeadline: siteContent?.wholesaleHeadline || '',
    wholesaleSubheadline: siteContent?.wholesaleSubheadline || '',
    footerAbout: siteContent?.footerAbout || '',
  });

  const handleSaveTexts = (e: React.FormEvent) => {
    e.preventDefault();
    updateSiteContent(textsForm);
    showToast('Website texts and headlines updated live on the storefront!');
  };

  // --- Sub-Tab 3: Contact & Socials State ---
  const [contactForm, setContactForm] = useState({
    name: company.name,
    legalName: company.legalName,
    domain: company.domain,
    whatsapp: company.whatsapp,
    emailGmail: company.emailGmail,
    emailOutlook: company.emailOutlook,
    gstin: company.gstin,
    state: company.state,
    address: company.address,
    facebook: company.socialLinks.facebook,
    instagram: company.socialLinks.instagram,
  });

  const handleSaveContacts = (e: React.FormEvent) => {
    e.preventDefault();
    updateCompany({
      name: contactForm.name,
      legalName: contactForm.legalName,
      domain: contactForm.domain,
      whatsapp: contactForm.whatsapp,
      emailGmail: contactForm.emailGmail,
      emailOutlook: contactForm.emailOutlook,
      gstin: contactForm.gstin,
      state: contactForm.state,
      address: contactForm.address,
      socials: {
        facebook: contactForm.facebook,
        instagram: contactForm.instagram,
      },
      socialLinks: {
        facebook: contactForm.facebook,
        instagram: contactForm.instagram,
        whatsapp: contactForm.whatsapp,
      },
    });
    showToast('Contact details, WhatsApp, and GST updated across website!');
  };

  // --- Sub-Tab 4: Products Manager State ---
  const [productSearch, setProductSearch] = useState('');
  const [editingProductId, setEditingProductId] = useState<string | null>(null);

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
    p.sku.toLowerCase().includes(productSearch.toLowerCase())
  );

  // Generate WhatsApp selling message for any product
  const getWhatsAppSellingText = (product: { name: string; price: number; sku: string; productLink?: string }) => {
    return encodeURIComponent(
      `Hello! I want to order "${product.name}" (SKU: ${product.sku}) at ₹${product.price} from udecs.store.\nDirect link: ${
        product.productLink || `https://udecs.store/#products`
      }`
    );
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-fadeIn text-[#0F1913]">
      {/* Toast Notification */}
      {successToast && (
        <div className="fixed top-5 right-5 z-50 bg-[#182620] text-white px-5 py-3 rounded-lg shadow-xl border border-[#CC9A2E] flex items-center gap-3 animate-slideDown">
          <CheckCircle className="w-5 h-5 text-[#25D366]" />
          <span className="text-xs font-semibold">{successToast}</span>
        </div>
      )}

      {/* Header Bar */}
      <div className="bg-[#FBFAF5] border border-[#CBCFB9] p-5 rounded-lg flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-[#3C6656]" />
            <h2 className="text-xl font-black font-heading tracking-tight">
              Website CMS & Online Selling Hub
            </h2>
            <span className="text-[10px] bg-[#CC9A2E]/20 text-[#A87C1F] font-mono px-2 py-0.5 rounded font-bold">
              LIVE CONTROL
            </span>
          </div>
          <p className="text-xs text-[#565F52] mt-1">
            Update storefront texts, contacts, and paste external or direct product links to sell online instantly.
          </p>
        </div>

        {/* Quick View Storefront Link */}
        <a
          href="#top"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 text-xs font-semibold bg-[#182620] hover:bg-[#0F1913] text-white px-4 py-2 rounded transition-colors shadow-xs self-start md:self-auto"
        >
          <Eye className="w-3.5 h-3.5 text-[#CC9A2E]" />
          <span>View Live Storefront ({company.domain})</span>
          <ExternalLink className="w-3 h-3 text-white/70" />
        </a>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-[#CBCFB9] overflow-x-auto pb-2 no-scrollbar">
        <button
          onClick={() => setActiveSubTab('domain_admin')}
          className={`px-4 py-2.5 rounded-t-md text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap ${
            activeSubTab === 'domain_admin'
              ? 'bg-[#182620] text-white shadow-xs'
              : 'bg-[#FBFAF5] text-[#565F52] hover:text-[#0F1913] border border-[#CBCFB9]'
          }`}
        >
          <Server className="w-4 h-4 text-[#CC9A2E]" />
          <span>Domain & Admin Setup (udecs.store)</span>
          <span className="text-[9px] bg-[#25D366] text-black px-1.5 py-0.2 rounded font-mono font-bold">
            LIVE
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('selling')}
          className={`px-4 py-2.5 rounded-t-md text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap ${
            activeSubTab === 'selling'
              ? 'bg-[#182620] text-white shadow-xs'
              : 'bg-[#FBFAF5] text-[#565F52] hover:text-[#0F1913] border border-[#CBCFB9]'
          }`}
        >
          <LinkIcon className="w-4 h-4 text-[#CC9A2E]" />
          <span>Sell Online via Product Link</span>
          <span className="text-[9px] bg-[#25D366] text-black px-1.5 py-0.2 rounded font-mono font-bold">
            NEW
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('whatsapp')}
          className={`px-4 py-2.5 rounded-t-md text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap ${
            activeSubTab === 'whatsapp'
              ? 'bg-[#182620] text-white shadow-xs'
              : 'bg-[#FBFAF5] text-[#565F52] hover:text-[#0F1913] border border-[#CBCFB9]'
          }`}
        >
          <MessageSquare className="w-4 h-4 text-[#25D366]" />
          <span>WhatsApp Automation Hub</span>
          <span className="text-[9px] bg-[#25D366] text-white px-1.5 py-0.2 rounded font-mono font-bold">
            ACTIVE
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('texts')}
          className={`px-4 py-2.5 rounded-t-md text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap ${
            activeSubTab === 'texts'
              ? 'bg-[#182620] text-white shadow-xs'
              : 'bg-[#FBFAF5] text-[#565F52] hover:text-[#0F1913] border border-[#CBCFB9]'
          }`}
        >
          <Edit className="w-4 h-4 text-[#A87C1F]" />
          <span>Website Texts & Hero CMS</span>
        </button>

        <button
          onClick={() => setActiveSubTab('contacts')}
          className={`px-4 py-2.5 rounded-t-md text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap ${
            activeSubTab === 'contacts'
              ? 'bg-[#182620] text-white shadow-xs'
              : 'bg-[#FBFAF5] text-[#565F52] hover:text-[#0F1913] border border-[#CBCFB9]'
          }`}
        >
          <Phone className="w-4 h-4 text-[#3C6656]" />
          <span>Contacts, WhatsApp & GSTIN</span>
        </button>

        <button
          onClick={() => setActiveSubTab('products')}
          className={`px-4 py-2.5 rounded-t-md text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap ${
            activeSubTab === 'products'
              ? 'bg-[#182620] text-white shadow-xs'
              : 'bg-[#FBFAF5] text-[#565F52] hover:text-[#0F1913] border border-[#CBCFB9]'
          }`}
        >
          <ShoppingBag className="w-4 h-4 text-[#CC9A2E]" />
          <span>Catalog Quick Editor ({products.length})</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 0: DOMAIN INTEGRATION (udecs.store) & DUAL ADMIN SETUP */}
      {/* ========================================================================= */}
      {activeSubTab === 'domain_admin' && (
        <div className="space-y-6">
          {/* Hero Banner Card */}
          <div className="bg-gradient-to-r from-[#182620] via-[#1f3329] to-[#253D32] text-white p-6 rounded-lg border border-[#3C6656] shadow-sm">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="max-w-3xl">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-[10px] font-mono uppercase tracking-wider bg-[#25D366] text-black px-2 py-0.5 rounded font-black flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-black animate-pulse" />
                    LIVE PRODUCTION DOMAIN
                  </span>
                  <span className="text-[11px] font-mono text-[#CC9A2E] font-bold">
                    udecs.store
                  </span>
                </div>
                <h3 className="text-xl sm:text-2xl font-bold font-heading mb-1.5">
                  Production Domain & Dual-Admin Control Center
                </h3>
                <p className="text-xs text-[#B9BFAE] leading-relaxed">
                  Your store is 100% integrated with domain <strong className="text-white">udecs.store</strong>. Both <strong className="text-white">Admin 1</strong> (SK Saharuk Hossain) and <strong className="text-white">Admin 2</strong> (UNICK DIGITAL Executive) are provisioned with master credentials, 1-click session switching, and active SSL/TLS security.
                </p>
              </div>

              <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 self-start lg:self-center shrink-0">
                <button
                  type="button"
                  onClick={handleRunDomainCheck}
                  disabled={isCheckingDomain}
                  className="bg-[#CC9A2E] hover:bg-[#A87C1F] text-[#0F1913] font-bold px-4 py-2.5 rounded text-xs flex items-center gap-1.5 transition-all shadow-xs disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isCheckingDomain ? 'animate-spin' : ''}`} />
                  <span>{isCheckingDomain ? 'Verifying Edge...' : 'Diagnostic Check'}</span>
                </button>

                <a
                  href="https://udecs.store"
                  target="_blank"
                  rel="noreferrer"
                  className="bg-white/10 hover:bg-white/20 text-white font-bold px-4 py-2.5 rounded text-xs flex items-center gap-1.5 border border-white/20 transition-all"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Visit udecs.store</span>
                </a>
              </div>
            </div>

            {/* Diagnostic Result Banner */}
            {domainCheckResult && (
              <div className="mt-4 p-3.5 bg-black/40 rounded border border-[#25D366]/40 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs animate-fadeIn">
                <div>
                  <span className="text-[10px] text-[#8C9385] uppercase block font-mono">Store Status</span>
                  <span className={`font-bold flex items-center gap-1 mt-0.5 ${domainCheckResult.isLive ? 'text-[#25D366]' : 'text-red-400'}`}>
                    {domainCheckResult.isLive ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                    {domainCheckResult.status}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-[#8C9385] uppercase block font-mono">Edge Latency</span>
                  <span className="font-bold text-white mt-0.5 block">{domainCheckResult.latency}</span>
                </div>
                <div>
                  <span className="text-[10px] text-[#8C9385] uppercase block font-mono">SSL Encryption</span>
                  <span className="font-bold text-[#CC9A2E] mt-0.5 block">{domainCheckResult.ssl}</span>
                </div>
                <div>
                  <span className="text-[10px] text-[#8C9385] uppercase block font-mono">Last Checked</span>
                  <span className="font-mono text-[#B9BFAE] mt-0.5 block">{domainCheckResult.timestamp}</span>
                </div>
              </div>
            )}
          </div>

          {/* Dual Admin Access Cards Grid */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="font-heading font-bold text-base text-[#0F1913] flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-[#3C6656]" />
                  <span>Configured Administrator Access (Admin 1 & Admin 2)</span>
                </h4>
                <p className="text-xs text-[#565F52] mt-0.5">
                  Both administrator profiles have full administrative access across the udecs.store platform.
                </p>
              </div>

              <span className="text-xs font-mono font-bold text-[#182620] bg-[#E4E8D9] px-2.5 py-1 rounded border border-[#CBCFB9]">
                Total Admins: 2 Active
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Admin 1 Card */}
              <div className={`p-5 rounded-lg border transition-all ${
                currentUser?.email === 'sksaharukhossain1996@gmail.com'
                  ? 'bg-gradient-to-br from-[#FBFAF5] to-[#EEF0E7] border-[#3C6656] shadow-md ring-2 ring-[#3C6656]/30'
                  : 'bg-white border-[#CBCFB9] shadow-xs'
              }`}>
                <div className="flex items-start justify-between gap-2 pb-3 border-b border-[#CBCFB9]">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#182620] text-[#CC9A2E] flex items-center justify-center font-bold text-sm border border-[#CC9A2E]/30">
                      SK
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-heading font-bold text-sm text-[#0F1913]">Admin 1 (Super Admin)</span>
                        <span className="text-[9px] bg-[#CC9A2E] text-black font-bold px-1.5 py-0.2 rounded font-mono">
                          OWNER
                        </span>
                      </div>
                      <span className="text-xs text-[#565F52] font-medium block">SK Saharuk Hossain</span>
                    </div>
                  </div>

                  {currentUser?.email === 'sksaharukhossain1996@gmail.com' ? (
                    <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Active Session
                    </span>
                  ) : (
                    <span className="text-[10px] text-[#565F52] font-mono bg-[#FBFAF5] px-2 py-0.5 rounded border border-[#CBCFB9]">
                      Standby
                    </span>
                  )}
                </div>

                <div className="mt-3.5 space-y-2.5 text-xs">
                  <div>
                    <label className="text-[10px] font-mono uppercase text-[#565F52] block font-bold">
                      User ID / Email Address
                    </label>
                    <div className="flex items-center justify-between mt-0.5 p-2 bg-[#FBFAF5] rounded border border-[#CBCFB9]">
                      <span className="font-mono text-[#0F1913] font-bold select-all truncate">
                        sksaharukhossain1996@gmail.com
                      </span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard('sksaharukhossain1996@gmail.com', 'Admin 1 Email')}
                        className="text-[#565F52] hover:text-[#0F1913] p-1 rounded hover:bg-[#E4E8D9]"
                        title="Copy User ID"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-mono uppercase text-[#565F52] block font-bold">
                      Authentication
                    </label>
                    <div className="flex items-center justify-between mt-0.5 p-2 bg-[#FBFAF5] rounded border border-[#CBCFB9]">
                      <span className="font-mono text-[#0F1913] font-bold">
                        {showAdmin1Pass ? 'Google sign-in only' : '•••••••••'}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setShowAdmin1Pass(!showAdmin1Pass)}
                          className="text-[#565F52] hover:text-[#0F1913] p-1 rounded hover:bg-[#E4E8D9]"
                          title={showAdmin1Pass ? 'Hide password' : 'Show password'}
                        >
                          {showAdmin1Pass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => copyToClipboard('', 'Admin 1 Password')}
                          className="text-[#565F52] hover:text-[#0F1913] p-1 rounded hover:bg-[#E4E8D9]"
                          title="Copy Password"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="pt-1">
                    <span className="text-[10px] text-[#565F52] block font-mono">Privileges:</span>
                    <ul className="text-[11px] text-[#0F1913] list-disc list-inside mt-0.5 space-y-0.5">
                      <li>Full ERP Ownership & Domain Master Control</li>
                      <li>PayU Merchant Keys, Salt & Bank Settlement</li>
                      <li>GST Legal Invoicing & GSTR-1 Excel Exports</li>
                      <li>Staff Payroll, Attendance & HR Slips</li>
                    </ul>
                  </div>

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        login('sksaharukhossain1996@gmail.com', '');
                        showToast('Sign in with the authorized Google account.');
                      }}
                      className="w-full bg-[#182620] hover:bg-[#0F1913] text-white py-2 px-3 rounded font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs"
                    >
                      <ArrowRightLeft className="w-3.5 h-3.5 text-[#CC9A2E]" />
                      <span>Switch Session to Admin 1</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Admin 2 Card */}
              <div className={`p-5 rounded-lg border transition-all ${
                currentUser?.email === 'ecommerceunickdigital@gmail.com'
                  ? 'bg-gradient-to-br from-[#FBFAF5] to-[#EEF0E7] border-[#3C6656] shadow-md ring-2 ring-[#3C6656]/30'
                  : 'bg-white border-[#CBCFB9] shadow-xs'
              }`}>
                <div className="flex items-start justify-between gap-2 pb-3 border-b border-[#CBCFB9]">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#182620] text-[#25D366] flex items-center justify-center font-bold text-sm border border-[#25D366]/30">
                      UD
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-heading font-bold text-sm text-[#0F1913]">Admin 2 (Executive)</span>
                        <span className="text-[9px] bg-[#25D366] text-black font-bold px-1.5 py-0.2 rounded font-mono">
                          OPERATIONS
                        </span>
                      </div>
                      <span className="text-xs text-[#565F52] font-medium block">UNICK DIGITAL Commerce</span>
                    </div>
                  </div>

                  {currentUser?.email === 'ecommerceunickdigital@gmail.com' ? (
                    <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Active Session
                    </span>
                  ) : (
                    <span className="text-[10px] text-[#565F52] font-mono bg-[#FBFAF5] px-2 py-0.5 rounded border border-[#CBCFB9]">
                      Standby
                    </span>
                  )}
                </div>

                <div className="mt-3.5 space-y-2.5 text-xs">
                  <div>
                    <label className="text-[10px] font-mono uppercase text-[#565F52] block font-bold">
                      User ID / Email Address
                    </label>
                    <div className="flex items-center justify-between mt-0.5 p-2 bg-[#FBFAF5] rounded border border-[#CBCFB9]">
                      <span className="font-mono text-[#0F1913] font-bold select-all truncate">
                        ecommerceunickdigital@gmail.com
                      </span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard('ecommerceunickdigital@gmail.com', 'Admin 2 Email')}
                        className="text-[#565F52] hover:text-[#0F1913] p-1 rounded hover:bg-[#E4E8D9]"
                        title="Copy User ID"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-mono uppercase text-[#565F52] block font-bold">
                      Authentication
                    </label>
                    <div className="flex items-center justify-between mt-0.5 p-2 bg-[#FBFAF5] rounded border border-[#CBCFB9]">
                      <span className="font-mono text-[#0F1913] font-bold">
                        {showAdmin2Pass ? 'Google sign-in only' : '•••••••••'}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setShowAdmin2Pass(!showAdmin2Pass)}
                          className="text-[#565F52] hover:text-[#0F1913] p-1 rounded hover:bg-[#E4E8D9]"
                          title={showAdmin2Pass ? 'Hide password' : 'Show password'}
                        >
                          {showAdmin2Pass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => copyToClipboard('', 'Admin 2 Password')}
                          className="text-[#565F52] hover:text-[#0F1913] p-1 rounded hover:bg-[#E4E8D9]"
                          title="Copy Password"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="pt-1">
                    <span className="text-[10px] text-[#565F52] block font-mono">Privileges:</span>
                    <ul className="text-[11px] text-[#0F1913] list-disc list-inside mt-0.5 space-y-0.5">
                      <li>Order Processing, Delhivery Logistics & AWB</li>
                      <li>Automated Inventory Stock Tracking & Re-order</li>
                      <li>WhatsApp Customer AI Chatbot & Auto-Confirmations</li>
                      <li>Storefront Hero Texts, Banner & CMS Products</li>
                    </ul>
                  </div>

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        login('ecommerceunickdigital@gmail.com', '');
                        showToast('Sign in with the authorized Google account.');
                      }}
                      className="w-full bg-[#182620] hover:bg-[#0F1913] text-white py-2 px-3 rounded font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs"
                    >
                      <ArrowRightLeft className="w-3.5 h-3.5 text-[#25D366]" />
                      <span>Switch Session to Admin 2</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Credential Tester & Domain Connectivity Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Credential Authentication Tester */}
            <div className="lg:col-span-6 bg-white p-5 rounded-lg border border-[#CBCFB9] shadow-xs space-y-3.5">
              <div className="flex items-center gap-2 pb-3 border-b border-[#CBCFB9]">
                <KeyRound className="w-5 h-5 text-[#CC9A2E]" />
                <div>
                  <h4 className="font-heading font-bold text-sm text-[#0F1913] uppercase tracking-wider">
                    Interactive Authentication Tester
                  </h4>
                  <p className="text-[11px] text-[#565F52]">
                    Test administrator login credentials directly on udecs.store
                  </p>
                </div>
              </div>

              {testAuthStatus && (
                <div
                  className={`p-3 rounded text-xs font-semibold flex items-center gap-2 ${
                    testAuthStatus.success
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-red-50 text-red-800 border border-red-200'
                  }`}
                >
                  {testAuthStatus.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  )}
                  <span>{testAuthStatus.message}</span>
                </div>
              )}

              <form onSubmit={handleTestAuth} className="space-y-3 text-xs">
                {/* Fast presets */}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setTestEmail('sksaharukhossain1996@gmail.com');
                      setTestPass('');
                    }}
                    className="flex-1 py-1.5 px-2 bg-[#FBFAF5] hover:bg-[#EEF0E7] text-[#0F1913] rounded border border-[#CBCFB9] font-mono text-[10px] font-bold text-center"
                  >
                    Preset: Admin 1
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTestEmail('ecommerceunickdigital@gmail.com');
                      setTestPass('');
                    }}
                    className="flex-1 py-1.5 px-2 bg-[#FBFAF5] hover:bg-[#EEF0E7] text-[#0F1913] rounded border border-[#CBCFB9] font-mono text-[10px] font-bold text-center"
                  >
                    Preset: Admin 2
                  </button>
                </div>

                <div>
                  <label className="block font-bold text-[#0F1913] mb-1">
                    Administrator Email / User ID
                  </label>
                  <input
                    type="email"
                    required
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                    className="w-full bg-[#FBFAF5] border border-[#CBCFB9] rounded p-2 text-[#0F1913] font-mono focus:outline-none focus:border-[#A87C1F]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#0F1913] mb-1">
                    Password
                  </label>
                  <input
                    type="password"
                    required
                    value={testPass}
                    onChange={(e) => setTestPass(e.target.value)}
                    className="w-full bg-[#FBFAF5] border border-[#CBCFB9] rounded p-2 text-[#0F1913] font-mono focus:outline-none focus:border-[#A87C1F]"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-[#0F1913] hover:bg-[#182620] text-white py-2.5 rounded font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-xs"
                >
                  <Lock className="w-3.5 h-3.5 text-[#CC9A2E]" />
                  <span>Authenticate & Verify Session</span>
                </button>
              </form>
            </div>

            {/* Right: Domain DNS & Live Activation Control */}
            <div className="lg:col-span-6 bg-white p-5 rounded-lg border border-[#CBCFB9] shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#CBCFB9]">
                <div className="flex items-center gap-2">
                  <Server className="w-5 h-5 text-[#3C6656]" />
                  <div>
                    <h4 className="font-heading font-bold text-sm text-[#0F1913] uppercase tracking-wider">
                      Live Domain Activation (udecs.store)
                    </h4>
                    <p className="text-[11px] text-[#565F52]">
                      GoDaddy DNS bindings & edge routing for production
                    </p>
                  </div>
                </div>

                <span className="text-[10px] font-mono font-bold bg-[#25D366]/20 text-[#0F1913] px-2 py-0.5 rounded border border-[#25D366]/40 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#25D366] animate-pulse" />
                  GoDaddy DNS Detected
                </span>
              </div>

              {/* Live Detected Info Strip */}
              <div className="p-3 bg-[#FBFAF5] rounded border border-[#CBCFB9] text-xs space-y-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-[#565F52]">Domain Registrar:</span>
                  <span className="font-mono font-bold text-[#0F1913]">GoDaddy (domaincontrol.com)</span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-[#565F52]">Primary Nameservers:</span>
                  <span className="font-mono text-[#3C6656] font-semibold">ns71 / ns72.domaincontrol.com</span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-[#565F52]">Active Edge Destination:</span>
                  <span className="font-mono text-emerald-800 font-bold bg-emerald-100 px-1.5 py-0.5 rounded">
                    {domainCheckResult?.edge || 'sksaharukhossain1996-dot.github.io'}
                  </span>
                </div>
              </div>

              {/* Method Switcher Tabs */}
              <div>
                <div className="flex items-center gap-2 border-b border-[#CBCFB9] pb-2">
                  <button
                    type="button"
                    onClick={() => setActiveDnsMethod('cloud')}
                    className={`text-xs px-3 py-1.5 rounded font-bold transition-all ${
                      activeDnsMethod === 'cloud'
                        ? 'bg-[#182620] text-white shadow-xs'
                        : 'bg-[#FBFAF5] text-[#565F52] hover:text-[#0F1913] border border-[#CBCFB9]'
                    }`}
                  >
                    পদ্ধতি ১: GoDaddy DNS → Google Cloud / Firebase (সুপারিশকৃত)
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveDnsMethod('github')}
                    className={`text-xs px-3 py-1.5 rounded font-bold transition-all ${
                      activeDnsMethod === 'github'
                        ? 'bg-[#182620] text-white shadow-xs'
                        : 'bg-[#FBFAF5] text-[#565F52] hover:text-[#0F1913] border border-[#CBCFB9]'
                    }`}
                  >
                    পদ্ধতি ২: GitHub Pages (তাত্ক্ষণিক লাইভ)
                  </button>
                </div>

                {activeDnsMethod === 'cloud' ? (
                  <div className="mt-3 space-y-3">
                    <p className="text-xs text-[#565F52] leading-relaxed">
                      GoDaddy অ্যাকাউন্টে লগইন করে <strong>udecs.store</strong> ডোমেইনের <strong>DNS Management</strong> সেকশনে গিয়ে নিচের রেকর্ডগুলি যোগ বা আপডেট করুন:
                    </p>

                    <div className="overflow-x-auto text-xs">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-[#CBCFB9] text-[10px] text-[#565F52] uppercase font-mono bg-[#FBFAF5]">
                            <th className="py-1.5 px-2">Type</th>
                            <th className="py-1.5 px-2">Name / Host</th>
                            <th className="py-1.5 px-2">Target Value</th>
                            <th className="py-1.5 px-2">TTL</th>
                            <th className="py-1.5 px-2 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#CBCFB9]/40 font-mono text-[11px]">
                          <tr>
                            <td className="py-2 px-2 text-[#A87C1F] font-bold">A</td>
                            <td className="py-2 px-2 font-bold">@</td>
                            <td className="py-2 px-2 font-bold">199.36.158.100</td>
                            <td className="py-2 px-2 text-[#565F52]">1/2 Hour</td>
                            <td className="py-2 px-2 text-right">
                              <button
                                type="button"
                                onClick={() => copyToClipboard('199.36.158.100', 'A Record')}
                                className="text-[#3C6656] hover:text-[#0F1913] font-sans font-bold text-[10px] bg-[#EEF0E7] px-2 py-0.5 rounded"
                              >
                                Copy IP
                              </button>
                            </td>
                          </tr>
                          <tr>
                            <td className="py-2 px-2 text-[#A87C1F] font-bold">CNAME</td>
                            <td className="py-2 px-2 font-bold">www</td>
                            <td className="py-2 px-2">udecs-store.web.app</td>
                            <td className="py-2 px-2 text-[#565F52]">1 Hour</td>
                            <td className="py-2 px-2 text-right">
                              <button
                                type="button"
                                onClick={() => copyToClipboard('udecs-store.web.app', 'CNAME Record')}
                                className="text-[#3C6656] hover:text-[#0F1913] font-sans font-bold text-[10px] bg-[#EEF0E7] px-2 py-0.5 rounded"
                              >
                                Copy Host
                              </button>
                            </td>
                          </tr>
                          <tr>
                            <td className="py-2 px-2 text-[#A87C1F] font-bold">TXT</td>
                            <td className="py-2 px-2 font-bold">@</td>
                            <td className="py-2 px-2 truncate max-w-[120px]">v=spf1 include:_spf.google.com ~all</td>
                            <td className="py-2 px-2 text-[#565F52]">1 Hour</td>
                            <td className="py-2 px-2 text-right">
                              <button
                                type="button"
                                onClick={() => copyToClipboard('v=spf1 include:_spf.google.com ~all', 'TXT SPF Record')}
                                className="text-[#3C6656] hover:text-[#0F1913] font-sans font-bold text-[10px] bg-[#EEF0E7] px-2 py-0.5 rounded"
                              >
                                Copy TXT
                              </button>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 space-y-3">
                    <div className="p-3 bg-emerald-50 rounded border border-emerald-200 text-xs text-emerald-900">
                      <strong>✅ তাত্ক্ষণিক লাইভ সুবিধা:</strong> আপনার GoDaddy ডোমেইন ইতিমধ্যে <code className="font-mono bg-white px-1 py-0.5 rounded">sksaharukhossain1996-dot.github.io</code>-এর দিকে পয়েন্ট করা আছে। কোনো DNS পরিবর্তন ছাড়াই আপনার GitHub রিপোজিটরিতে বিল্ড ফাইল পুশ করলে <strong>udecs.store</strong> সরাসরি লাইভ হয়ে যাবে!
                    </div>

                    <div className="bg-[#182620] text-[#EEF0E7] p-3 rounded font-mono text-[11px] space-y-1">
                      <div className="text-[#8C9385] text-[10px]"># এক-ক্লিকে ডিপ্লয়মেন্ট কমান্ড:</div>
                      <div className="text-[#25D366] select-all">npm run build</div>
                      <div className="text-white select-all">git add .</div>
                      <div className="text-white select-all">git commit -m "Deploy latest UDECS live storefront to udecs.store"</div>
                      <div className="text-[#CC9A2E] select-all">git push origin main</div>
                    </div>

                    <button
                      type="button"
                      onClick={() => copyToClipboard('npm run build && git add . && git commit -m "Deploy latest UDECS live storefront" && git push origin main', 'Deploy Commands')}
                      className="w-full bg-[#FBFAF5] hover:bg-[#EEF0E7] text-[#0F1913] py-2 px-3 rounded border border-[#CBCFB9] font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
                    >
                      <Copy className="w-3.5 h-3.5 text-[#3C6656]" />
                      <span>কমান্ডগুলো কপি করুন (Copy Deployment Commands)</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Live Links Strip */}
              <div className="pt-2 border-t border-[#CBCFB9] space-y-1.5 text-xs text-[#565F52]">
                <div className="flex justify-between py-1 items-center">
                  <span>Production Storefront:</span>
                  <a
                    href="https://udecs.store"
                    target="_blank"
                    rel="noreferrer"
                    className="font-mono text-[#3C6656] font-bold hover:underline flex items-center gap-1 bg-[#EEF0E7] px-2 py-0.5 rounded"
                  >
                    https://udecs.store
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <div className="flex justify-between py-1">
                  <span>PayU Settlement Webhook:</span>
                  <span className="font-mono text-[#0F1913]">https://udecs.store/api/payu/webhook</span>
                </div>
                <div className="flex justify-between py-1">
                  <span>WhatsApp Automation Webhook:</span>
                  <span className="font-mono text-[#0F1913]">Configure the Render API webhook URL in Meta</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 1: QUICK ONLINE SELLING VIA PRODUCT LINK */}
      {/* ========================================================================= */}
      {activeSubTab === 'selling' && (
        <div className="space-y-6">
          {/* Quick Paste Hero Card */}
          <div className="bg-gradient-to-r from-[#182620] to-[#253D32] text-white p-6 rounded-lg border border-[#3C6656] shadow-sm">
            <div className="max-w-3xl">
              <span className="text-[11px] font-mono uppercase tracking-wider text-[#CC9A2E] font-bold block mb-1">
                Instant Online Selling
              </span>
              <h3 className="text-xl font-bold font-heading mb-2">
                Paste Any Product Link or Supplier URL to Sell Directly on udecs.store
              </h3>
              <p className="text-xs text-[#B9BFAE] leading-relaxed mb-4">
                Paste any link from an external supplier, marketplace, affiliate source, or product page. Our intelligent parser will extract product details, allow you to set your selling price & wholesale margin, and generate a 1-click buyable product in your store with WhatsApp & PayU checkout!
              </p>

              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="url"
                  placeholder="Paste product link here (e.g., https://amazon.in/dp/... or https://supplier.com/item...)"
                  value={pastedUrl}
                  onChange={(e) => setPastedUrl(e.target.value)}
                  className="flex-1 bg-white text-[#0F1913] px-3.5 py-2.5 rounded text-xs focus:outline-none focus:ring-2 focus:ring-[#CC9A2E]"
                />
                <button
                  type="button"
                  onClick={() => handleParseProductLink()}
                  className="bg-[#CC9A2E] hover:bg-[#A87C1F] text-[#0F1913] font-bold px-5 py-2.5 rounded text-xs flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Analyze & Import</span>
                </button>
              </div>
            </div>
          </div>

          {/* Form & Live Preview Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left: Product Configuration Form */}
            <div className="lg:col-span-7 bg-[#FBFAF5] border border-[#CBCFB9] p-6 rounded-lg shadow-xs">
              <h4 className="font-bold text-sm font-heading border-b border-[#CBCFB9] pb-2 mb-4 flex items-center justify-between">
                <span>Product Configuration & Selling Margins</span>
                <span className="text-[11px] text-[#565F52] font-mono">SKU: {sellingForm.sku}</span>
              </h4>

              <form onSubmit={handlePublishProduct} className="space-y-4 text-xs">
                {/* Product Name */}
                <div>
                  <label className="block font-bold mb-1 text-[#182620]">
                    Product Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={sellingForm.name}
                    onChange={(e) => setSellingForm({ ...sellingForm, name: e.target.value })}
                    placeholder="e.g. 5-Ply Stainless Steel Pressure Cooker 5L"
                    className="w-full bg-white border border-[#CBCFB9] rounded p-2.5 focus:border-[#A87C1F] focus:outline-none"
                  />
                </div>

                {/* Category & HSN */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold mb-1 text-[#182620]">Category</label>
                    <select
                      value={sellingForm.category}
                      onChange={(e) =>
                        setSellingForm({
                          ...sellingForm,
                          category: e.target.value as any,
                        })
                      }
                      className="w-full bg-white border border-[#CBCFB9] rounded p-2.5 focus:border-[#A87C1F] focus:outline-none"
                    >
                      <option value="kitchen">Kitchen & Cookware</option>
                      <option value="sports">Sports & Physical Fitness</option>
                      <option value="wholesale">B2B Wholesale Pallets</option>
                      <option value="industrial">Industrial Tools & Hardware</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold mb-1 text-[#182620]">HSN Code</label>
                    <input
                      type="text"
                      value={sellingForm.hsn}
                      onChange={(e) => setSellingForm({ ...sellingForm, hsn: e.target.value })}
                      placeholder="e.g. 73239390"
                      className="w-full bg-white border border-[#CBCFB9] rounded p-2.5 focus:border-[#A87C1F] focus:outline-none font-mono"
                    />
                  </div>
                </div>

                {/* Price, Wholesale Price, GST */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-bold mb-1 text-[#182620]">
                      Retail Price (₹) *
                    </label>
                    <input
                      type="number"
                      required
                      value={sellingForm.price}
                      onChange={(e) => setSellingForm({ ...sellingForm, price: Number(e.target.value) })}
                      className="w-full bg-white border border-[#CBCFB9] rounded p-2.5 focus:border-[#A87C1F] focus:outline-none font-semibold text-sm"
                    />
                  </div>

                  <div>
                    <label className="block font-bold mb-1 text-[#182620]">
                      Wholesale Price (₹)
                    </label>
                    <input
                      type="number"
                      value={sellingForm.wholesalePrice}
                      onChange={(e) =>
                        setSellingForm({ ...sellingForm, wholesalePrice: Number(e.target.value) })
                      }
                      className="w-full bg-white border border-[#CBCFB9] rounded p-2.5 focus:border-[#A87C1F] focus:outline-none font-semibold text-sm"
                    />
                  </div>

                  <div>
                    <label className="block font-bold mb-1 text-[#182620]">GST Rate (%)</label>
                    <select
                      value={sellingForm.gstRate}
                      onChange={(e) => setSellingForm({ ...sellingForm, gstRate: Number(e.target.value) })}
                      className="w-full bg-white border border-[#CBCFB9] rounded p-2.5 focus:border-[#A87C1F] focus:outline-none"
                    >
                      <option value={5}>5% GST</option>
                      <option value={12}>12% GST</option>
                      <option value={18}>18% GST (Standard)</option>
                      <option value={28}>28% GST</option>
                    </select>
                  </div>
                </div>

                {/* Stock & Wholesale Min Qty */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold mb-1 text-[#182620]">Initial Stock Units</label>
                    <input
                      type="number"
                      value={sellingForm.stock}
                      onChange={(e) => setSellingForm({ ...sellingForm, stock: Number(e.target.value) })}
                      className="w-full bg-white border border-[#CBCFB9] rounded p-2.5 focus:border-[#A87C1F] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-bold mb-1 text-[#182620]">
                      Min Wholesale Quantity
                    </label>
                    <input
                      type="number"
                      value={sellingForm.minWholesaleQty}
                      onChange={(e) =>
                        setSellingForm({ ...sellingForm, minWholesaleQty: Number(e.target.value) })
                      }
                      className="w-full bg-white border border-[#CBCFB9] rounded p-2.5 focus:border-[#A87C1F] focus:outline-none"
                    />
                  </div>
                </div>

                {/* Image URL & Vector Icon */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold mb-1 text-[#182620]">
                      Product Image URL (Optional)
                    </label>
                    <input
                      type="url"
                      value={sellingForm.imageUrl}
                      onChange={(e) => setSellingForm({ ...sellingForm, imageUrl: e.target.value })}
                      placeholder="https://.../product.jpg"
                      className="w-full bg-white border border-[#CBCFB9] rounded p-2.5 focus:border-[#A87C1F] focus:outline-none font-mono text-[11px]"
                    />
                    <p className="text-[10px] text-[#565F52] mt-0.5">
                      Paste direct web image link, or leave blank to use icon below.
                    </p>
                  </div>

                  <div>
                    <label className="block font-bold mb-1 text-[#182620]">Fallback Vector Icon</label>
                    <select
                      value={sellingForm.imageIcon}
                      onChange={(e) => setSellingForm({ ...sellingForm, imageIcon: e.target.value })}
                      className="w-full bg-white border border-[#CBCFB9] rounded p-2.5 focus:border-[#A87C1F] focus:outline-none"
                    >
                      <option value="i-pot">Kitchen: Cookware Pot / Pan</option>
                      <option value="i-blender">Kitchen: Blender / Mixer</option>
                      <option value="i-box">Kitchen: Food Container Set</option>
                      <option value="i-casserole">Kitchen: Thermal Hotpot Casserole</option>
                      <option value="i-dumbbell">Sports: Dumbbells / Weights</option>
                      <option value="i-racket">Sports: Badminton / Tennis Racket</option>
                      <option value="i-ball">Sports: Pro Match Football</option>
                      <option value="i-crate">Wholesale: Wooden Pallet / Crate</option>
                      <option value="i-truck">Logistics: Container Lot</option>
                      <option value="i-wrench">Industrial: Hardware & Toolset</option>
                    </select>
                  </div>
                </div>

                {/* External Sourced Product Link */}
                <div>
                  <label className="block font-bold mb-1 text-[#182620]">
                    Direct Sourced / External Product Link
                  </label>
                  <input
                    type="url"
                    value={sellingForm.productLink}
                    onChange={(e) => setSellingForm({ ...sellingForm, productLink: e.target.value })}
                    placeholder="e.g. https://... or leave empty if locally stocked"
                    className="w-full bg-white border border-[#CBCFB9] rounded p-2.5 focus:border-[#A87C1F] focus:outline-none font-mono text-[11px]"
                  />
                  <p className="text-[10px] text-[#565F52] mt-0.5">
                    This link will be attached to the product and included in WhatsApp selling messages.
                  </p>
                </div>

                {/* Description */}
                <div>
                  <label className="block font-bold mb-1 text-[#182620]">
                    Product Specification / Description
                  </label>
                  <textarea
                    rows={2}
                    value={sellingForm.description}
                    onChange={(e) => setSellingForm({ ...sellingForm, description: e.target.value })}
                    placeholder="Enter key specifications, materials, warranty, or packaging details..."
                    className="w-full bg-white border border-[#CBCFB9] rounded p-2.5 focus:border-[#A87C1F] focus:outline-none"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full bg-[#182620] hover:bg-[#0F1913] text-white py-3 rounded font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-xs"
                  >
                    <Plus className="w-4 h-4 text-[#CC9A2E]" />
                    <span>Publish & Start Selling on Website Now</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Right: Live Preview & Social Selling Link Generator */}
            <div className="lg:col-span-5 space-y-4">
              {/* Live Preview Card */}
              <div className="bg-[#FBFAF5] border border-[#CBCFB9] p-5 rounded-lg shadow-xs">
                <span className="text-[10px] uppercase font-bold text-[#A87C1F] font-mono block mb-2">
                  Live Storefront Preview
                </span>

                <div className="bg-white border border-[#CBCFB9] rounded-md p-4 space-y-3">
                  <div className="aspect-video bg-[#E4E8D9] rounded flex items-center justify-center overflow-hidden relative">
                    {sellingForm.imageUrl ? (
                      <img
                        src={sellingForm.imageUrl}
                        alt="Preview"
                        className="w-full h-full object-contain p-2"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <ProductIcon name={sellingForm.imageIcon} className="w-20 h-20 text-[#3C6656]" />
                    )}
                    <span className="absolute top-2 left-2 bg-[#182620] text-[#CC9A2E] text-[10px] font-mono px-2 py-0.5 rounded">
                      {sellingForm.sku}
                    </span>
                    <span className="absolute top-2 right-2 bg-white text-[#0F1913] text-[10px] font-bold px-1.5 py-0.5 rounded shadow-xs">
                      GST {sellingForm.gstRate}%
                    </span>
                  </div>

                  <div>
                    <h5 className="font-bold text-sm text-[#0F1913] line-clamp-1">
                      {sellingForm.name || 'Your Product Title Will Appear Here'}
                    </h5>
                    <p className="text-[11px] text-[#565F52] line-clamp-2 mt-1">
                      {sellingForm.description || 'Product specifications and details will appear here.'}
                    </p>
                  </div>

                  <div className="flex items-baseline justify-between pt-2 border-t border-[#CBCFB9]">
                    <div>
                      <span className="text-[10px] text-[#565F52] block">Online Price:</span>
                      <span className="text-base font-extrabold text-[#0F1913]">
                        {formatPrice(sellingForm.price)}
                      </span>
                    </div>
                    {sellingForm.wholesalePrice > 0 && (
                      <div className="text-right">
                        <span className="text-[10px] text-[#A87C1F] block">
                          Wholesale ({sellingForm.minWholesaleQty}+):
                        </span>
                        <span className="text-xs font-bold text-[#A87C1F]">
                          {formatPrice(sellingForm.wholesalePrice)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* 1-Click Social & WhatsApp Selling Links */}
              <div className="bg-[#FBFAF5] border border-[#CBCFB9] p-5 rounded-lg shadow-xs space-y-3">
                <span className="text-[10px] uppercase font-bold text-[#3C6656] font-mono block">
                  1-Click Online Selling & Share Links
                </span>

                {/* WhatsApp Direct Order Link */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold flex items-center gap-1.5 text-[#0F1913]">
                      <Phone className="w-3.5 h-3.5 text-[#25D366]" />
                      <span>WhatsApp Direct Order Link</span>
                    </span>
                    <button
                      onClick={() =>
                        copyToClipboard(
                          `https://wa.me/${company.whatsapp.replace(/[^0-9]/g, '')}?text=${getWhatsAppSellingText({
                            name: sellingForm.name || 'Selected Item',
                            price: sellingForm.price,
                            sku: sellingForm.sku,
                            productLink: sellingForm.productLink,
                          })}`,
                          'WhatsApp Order Link'
                        )
                      }
                      className="text-[11px] text-[#3C6656] hover:underline font-semibold flex items-center gap-1"
                    >
                      <Copy className="w-3 h-3" />
                      <span>{copiedLink === 'WhatsApp Order Link' ? 'Copied!' : 'Copy Link'}</span>
                    </button>
                  </div>
                  <input
                    readOnly
                    value={`https://wa.me/${company.whatsapp.replace(/[^0-9]/g, '')}?text=${getWhatsAppSellingText({
                      name: sellingForm.name || 'Selected Item',
                      price: sellingForm.price,
                      sku: sellingForm.sku,
                      productLink: sellingForm.productLink,
                    })}`}
                    className="w-full bg-white border border-[#CBCFB9] text-[10px] text-[#565F52] p-2 rounded font-mono truncate"
                  />
                </div>

                {/* Store Catalog Direct Anchor */}
                <div className="space-y-1 pt-1">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold flex items-center gap-1.5 text-[#0F1913]">
                      <Globe className="w-3.5 h-3.5 text-[#CC9A2E]" />
                      <span>Store Direct Selling Link</span>
                    </span>
                    <button
                      onClick={() =>
                        copyToClipboard(
                          `https://${company.domain}/#products`,
                          'Store Direct Link'
                        )
                      }
                      className="text-[11px] text-[#3C6656] hover:underline font-semibold flex items-center gap-1"
                    >
                      <Copy className="w-3 h-3" />
                      <span>{copiedLink === 'Store Direct Link' ? 'Copied!' : 'Copy Link'}</span>
                    </button>
                  </div>
                  <input
                    readOnly
                    value={`https://${company.domain}/#products`}
                    className="w-full bg-white border border-[#CBCFB9] text-[10px] text-[#565F52] p-2 rounded font-mono truncate"
                  />
                </div>

                {/* Social Post Caption Generator for Facebook & Instagram */}
                <div className="pt-2 border-t border-[#CBCFB9]">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-bold text-xs flex items-center gap-1.5">
                      <Share2 className="w-3.5 h-3.5 text-[#1877F2]" />
                      <span>Facebook / Instagram Ready Post Copy</span>
                    </span>
                    <button
                      onClick={() =>
                        copyToClipboard(
                          `🔥 NEW ARRIVAL: ${sellingForm.name}\n💰 Price: ₹${sellingForm.price} (Wholesale: ₹${sellingForm.wholesalePrice})\n✅ 100% GST ITC Invoices (GST: ${company.gstin})\n🚚 Pan-India Express Delivery\n📲 Order via WhatsApp: ${company.whatsapp}\n🌐 Shop Online: https://${company.domain}/#products`,
                          'Social Media Post'
                        )
                      }
                      className="text-[11px] text-[#A87C1F] hover:underline font-bold flex items-center gap-1"
                    >
                      <Copy className="w-3 h-3" />
                      <span>{copiedLink === 'Social Media Post' ? 'Copied!' : 'Copy Post'}</span>
                    </button>
                  </div>
                  <div className="bg-[#E4E8D9] p-2.5 rounded text-[11px] text-[#182620] font-mono leading-relaxed select-all">
                    🔥 NEW ARRIVAL: {sellingForm.name || 'Premium Cookware / Sports Gear'}
                    <br />
                    💰 Price: ₹{sellingForm.price} | Wholesale: ₹{sellingForm.wholesalePrice}
                    <br />
                    ✅ Official GST Tax Invoice (GST: {company.gstin})
                    <br />
                    📲 Order via WhatsApp: {company.whatsapp}
                    <br />
                    🌐 Direct Store: https://{company.domain}/#products
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB: WHATSAPP AUTOMATION HUB & SETTINGS */}
      {/* ========================================================================= */}
      {activeSubTab === 'whatsapp' && (
        <div className="bg-[#FBFAF5] border border-[#CBCFB9] rounded-lg">
          <AdminWhatsAppAutomation />
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: WEBSITE TEXTS & HERO CMS */}
      {/* ========================================================================= */}
      {activeSubTab === 'texts' && (
        <form onSubmit={handleSaveTexts} className="space-y-6 text-xs">
          <div className="bg-[#FBFAF5] border border-[#CBCFB9] p-6 rounded-lg shadow-xs space-y-4">
            <h4 className="font-bold text-sm font-heading border-b border-[#CBCFB9] pb-2 text-[#0F1913]">
              1. Hero Banner, Headlines & Value Proposition
            </h4>

            {/* Top Announcement Bar */}
            <div>
              <label className="block font-bold mb-1 text-[#182620]">
                Top Announcement Marquee Banner
              </label>
              <input
                type="text"
                value={textsForm.announcement}
                onChange={(e) => setTextsForm({ ...textsForm, announcement: e.target.value })}
                className="w-full bg-white border border-[#CBCFB9] rounded p-2.5 focus:border-[#A87C1F] focus:outline-none"
              />
            </div>

            {/* Hero Badge & Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-bold mb-1 text-[#182620]">Hero Top Badge</label>
                <input
                  type="text"
                  value={textsForm.heroBadge}
                  onChange={(e) => setTextsForm({ ...textsForm, heroBadge: e.target.value })}
                  className="w-full bg-white border border-[#CBCFB9] rounded p-2.5 focus:border-[#A87C1F] focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-bold mb-1 text-[#182620]">Primary Button Label</label>
                <input
                  type="text"
                  value={textsForm.heroCtaButton}
                  onChange={(e) => setTextsForm({ ...textsForm, heroCtaButton: e.target.value })}
                  className="w-full bg-white border border-[#CBCFB9] rounded p-2.5 focus:border-[#A87C1F] focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-bold mb-1 text-[#182620]">Secondary Button Label</label>
                <input
                  type="text"
                  value={textsForm.heroSecondaryButton}
                  onChange={(e) =>
                    setTextsForm({ ...textsForm, heroSecondaryButton: e.target.value })
                  }
                  className="w-full bg-white border border-[#CBCFB9] rounded p-2.5 focus:border-[#A87C1F] focus:outline-none"
                />
              </div>
            </div>

            {/* Hero Main Headline (Split in Two for Styling) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold mb-1 text-[#182620]">
                  Hero Main Headline (First Line)
                </label>
                <input
                  type="text"
                  value={textsForm.heroHeadline}
                  onChange={(e) => setTextsForm({ ...textsForm, heroHeadline: e.target.value })}
                  className="w-full bg-white border border-[#CBCFB9] rounded p-2.5 focus:border-[#A87C1F] focus:outline-none font-bold"
                />
              </div>
              <div>
                <label className="block font-bold mb-1 text-[#182620]">
                  Hero Highlighted Headline (Green Accent Line)
                </label>
                <input
                  type="text"
                  value={textsForm.heroHeadlineHighlight}
                  onChange={(e) =>
                    setTextsForm({ ...textsForm, heroHeadlineHighlight: e.target.value })
                  }
                  className="w-full bg-white border border-[#CBCFB9] rounded p-2.5 focus:border-[#A87C1F] focus:outline-none font-bold text-[#3C6656]"
                />
              </div>
            </div>

            {/* Hero Subheadline */}
            <div>
              <label className="block font-bold mb-1 text-[#182620]">Hero Subheadline Text</label>
              <textarea
                rows={2}
                value={textsForm.heroSubheadline}
                onChange={(e) => setTextsForm({ ...textsForm, heroSubheadline: e.target.value })}
                className="w-full bg-white border border-[#CBCFB9] rounded p-2.5 focus:border-[#A87C1F] focus:outline-none"
              />
            </div>
          </div>

          {/* Stats Bar */}
          <div className="bg-[#FBFAF5] border border-[#CBCFB9] p-6 rounded-lg shadow-xs space-y-4">
            <h4 className="font-bold text-sm font-heading border-b border-[#CBCFB9] pb-2 text-[#0F1913]">
              2. Key Business Metrics & Stats Bar
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="block font-bold mb-1 text-[#182620]">Metric 1 (Catalog Size)</label>
                <input
                  type="text"
                  value={textsForm.statProducts}
                  onChange={(e) => setTextsForm({ ...textsForm, statProducts: e.target.value })}
                  placeholder="3,000+ Products"
                  className="w-full bg-white border border-[#CBCFB9] rounded p-2.5 focus:border-[#A87C1F] focus:outline-none font-bold"
                />
              </div>
              <div>
                <label className="block font-bold mb-1 text-[#182620]">Metric 2 (Experience)</label>
                <input
                  type="text"
                  value={textsForm.statExperience}
                  onChange={(e) => setTextsForm({ ...textsForm, statExperience: e.target.value })}
                  placeholder="12+ Years Experience"
                  className="w-full bg-white border border-[#CBCFB9] rounded p-2.5 focus:border-[#A87C1F] focus:outline-none font-bold"
                />
              </div>
              <div>
                <label className="block font-bold mb-1 text-[#182620]">Metric 3 (Clients)</label>
                <input
                  type="text"
                  value={textsForm.statClients}
                  onChange={(e) => setTextsForm({ ...textsForm, statClients: e.target.value })}
                  placeholder="500+ Wholesale Clients"
                  className="w-full bg-white border border-[#CBCFB9] rounded p-2.5 focus:border-[#A87C1F] focus:outline-none font-bold"
                />
              </div>
              <div>
                <label className="block font-bold mb-1 text-[#182620]">Metric 4 (Delivery)</label>
                <input
                  type="text"
                  value={textsForm.statDistricts}
                  onChange={(e) => setTextsForm({ ...textsForm, statDistricts: e.target.value })}
                  placeholder="Pan-India Logistics"
                  className="w-full bg-white border border-[#CBCFB9] rounded p-2.5 focus:border-[#A87C1F] focus:outline-none font-bold"
                />
              </div>
            </div>
          </div>

          {/* Wholesale Section Text */}
          <div className="bg-[#FBFAF5] border border-[#CBCFB9] p-6 rounded-lg shadow-xs space-y-4">
            <h4 className="font-bold text-sm font-heading border-b border-[#CBCFB9] pb-2 text-[#0F1913]">
              3. Wholesale & Footer Copy
            </h4>
            <div className="space-y-3">
              <div>
                <label className="block font-bold mb-1 text-[#182620]">
                  Wholesale B2B Section Title
                </label>
                <input
                  type="text"
                  value={textsForm.wholesaleHeadline}
                  onChange={(e) => setTextsForm({ ...textsForm, wholesaleHeadline: e.target.value })}
                  className="w-full bg-white border border-[#CBCFB9] rounded p-2.5 focus:border-[#A87C1F] focus:outline-none font-bold"
                />
              </div>
              <div>
                <label className="block font-bold mb-1 text-[#182620]">
                  Wholesale Subheadline
                </label>
                <textarea
                  rows={2}
                  value={textsForm.wholesaleSubheadline}
                  onChange={(e) =>
                    setTextsForm({ ...textsForm, wholesaleSubheadline: e.target.value })
                  }
                  className="w-full bg-white border border-[#CBCFB9] rounded p-2.5 focus:border-[#A87C1F] focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-bold mb-1 text-[#182620]">
                  Footer Company Description
                </label>
                <textarea
                  rows={2}
                  value={textsForm.footerAbout}
                  onChange={(e) => setTextsForm({ ...textsForm, footerAbout: e.target.value })}
                  className="w-full bg-white border border-[#CBCFB9] rounded p-2.5 focus:border-[#A87C1F] focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="bg-[#182620] hover:bg-[#0F1913] text-white px-6 py-3 rounded font-bold text-xs flex items-center gap-2 shadow-xs transition-colors"
            >
              <Save className="w-4 h-4 text-[#CC9A2E]" />
              <span>Save & Publish Website Texts</span>
            </button>
          </div>
        </form>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: CONTACTS, WHATSAPP & GSTIN */}
      {/* ========================================================================= */}
      {activeSubTab === 'contacts' && (
        <form onSubmit={handleSaveContacts} className="space-y-6 text-xs">
          <div className="bg-[#FBFAF5] border border-[#CBCFB9] p-6 rounded-lg shadow-xs space-y-4">
            <h4 className="font-bold text-sm font-heading border-b border-[#CBCFB9] pb-2 text-[#0F1913]">
              Official Company Identification & Compliance
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold mb-1 text-[#182620]">
                  Trading Brand Name
                </label>
                <input
                  type="text"
                  required
                  value={contactForm.name}
                  onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                  className="w-full bg-white border border-[#CBCFB9] rounded p-2.5 focus:border-[#A87C1F] focus:outline-none font-bold"
                />
              </div>

              <div>
                <label className="block font-bold mb-1 text-[#182620]">
                  Registered Company Legal Name
                </label>
                <input
                  type="text"
                  required
                  value={contactForm.legalName}
                  onChange={(e) => setContactForm({ ...contactForm, legalName: e.target.value })}
                  className="w-full bg-white border border-[#CBCFB9] rounded p-2.5 focus:border-[#A87C1F] focus:outline-none font-bold"
                />
              </div>

              <div>
                <label className="block font-bold mb-1 text-[#182620]">
                  Domain Name (Godaddy)
                </label>
                <input
                  type="text"
                  required
                  value={contactForm.domain}
                  onChange={(e) => setContactForm({ ...contactForm, domain: e.target.value })}
                  className="w-full bg-white border border-[#CBCFB9] rounded p-2.5 focus:border-[#A87C1F] focus:outline-none font-mono text-[#3C6656] font-bold"
                />
              </div>

              <div>
                <label className="block font-bold mb-1 text-[#182620]">
                  Official GSTIN (GST Number)
                </label>
                <input
                  type="text"
                  required
                  value={contactForm.gstin}
                  onChange={(e) => setContactForm({ ...contactForm, gstin: e.target.value })}
                  className="w-full bg-white border border-[#CBCFB9] rounded p-2.5 focus:border-[#A87C1F] focus:outline-none font-mono font-bold text-[#A87C1F]"
                />
              </div>
            </div>
          </div>

          {/* Communications & Support Desk */}
          <div className="bg-[#FBFAF5] border border-[#CBCFB9] p-6 rounded-lg shadow-xs space-y-4">
            <h4 className="font-bold text-sm font-heading border-b border-[#CBCFB9] pb-2 text-[#0F1913]">
              Communication Channels & Live Customer Support
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block font-bold mb-1 text-[#182620] flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-[#25D366]" />
                  <span>WhatsApp Business Number</span>
                </label>
                <input
                  type="text"
                  required
                  value={contactForm.whatsapp}
                  onChange={(e) => setContactForm({ ...contactForm, whatsapp: e.target.value })}
                  className="w-full bg-white border border-[#CBCFB9] rounded p-2.5 focus:border-[#A87C1F] focus:outline-none font-mono font-bold"
                />
              </div>

              <div>
                <label className="block font-bold mb-1 text-[#182620] flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-[#EA4335]" />
                  <span>Support Gmail Address</span>
                </label>
                <input
                  type="email"
                  required
                  value={contactForm.emailGmail}
                  onChange={(e) => setContactForm({ ...contactForm, emailGmail: e.target.value })}
                  className="w-full bg-white border border-[#CBCFB9] rounded p-2.5 focus:border-[#A87C1F] focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block font-bold mb-1 text-[#182620] flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-[#0078D4]" />
                  <span>Official Outlook Address</span>
                </label>
                <input
                  type="email"
                  required
                  value={contactForm.emailOutlook}
                  onChange={(e) => setContactForm({ ...contactForm, emailOutlook: e.target.value })}
                  className="w-full bg-white border border-[#CBCFB9] rounded p-2.5 focus:border-[#A87C1F] focus:outline-none font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold mb-1 text-[#182620]">
                Registered Physical Address
              </label>
              <textarea
                rows={2}
                value={contactForm.address}
                onChange={(e) => setContactForm({ ...contactForm, address: e.target.value })}
                className="w-full bg-white border border-[#CBCFB9] rounded p-2.5 focus:border-[#A87C1F] focus:outline-none"
              />
            </div>
          </div>

          {/* Social Media Links */}
          <div className="bg-[#FBFAF5] border border-[#CBCFB9] p-6 rounded-lg shadow-xs space-y-4">
            <h4 className="font-bold text-sm font-heading border-b border-[#CBCFB9] pb-2 text-[#0F1913]">
              Social Media Accounts (Facebook & Instagram)
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold mb-1 text-[#182620] flex items-center gap-1.5">
                  <Facebook className="w-3.5 h-3.5 text-[#1877F2]" />
                  <span>Facebook Page URL</span>
                </label>
                <input
                  type="url"
                  value={contactForm.facebook}
                  onChange={(e) => setContactForm({ ...contactForm, facebook: e.target.value })}
                  className="w-full bg-white border border-[#CBCFB9] rounded p-2.5 focus:border-[#A87C1F] focus:outline-none font-mono text-[11px]"
                />
              </div>

              <div>
                <label className="block font-bold mb-1 text-[#182620] flex items-center gap-1.5">
                  <Instagram className="w-3.5 h-3.5 text-[#DD2A7B]" />
                  <span>Instagram Profile URL</span>
                </label>
                <input
                  type="url"
                  value={contactForm.instagram}
                  onChange={(e) => setContactForm({ ...contactForm, instagram: e.target.value })}
                  className="w-full bg-white border border-[#CBCFB9] rounded p-2.5 focus:border-[#A87C1F] focus:outline-none font-mono text-[11px]"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="bg-[#182620] hover:bg-[#0F1913] text-white px-6 py-3 rounded font-bold text-xs flex items-center gap-2 shadow-xs transition-colors"
            >
              <Save className="w-4 h-4 text-[#CC9A2E]" />
              <span>Save & Update Contact Details</span>
            </button>
          </div>
        </form>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: CATALOG QUICK EDITOR & LINKS */}
      {/* ========================================================================= */}
      {activeSubTab === 'products' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-3 text-[#565F52]" />
              <input
                type="text"
                placeholder="Search products by title or SKU..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                className="w-full text-xs pl-9 pr-3 py-2.5 bg-white border border-[#CBCFB9] rounded focus:outline-none focus:border-[#A87C1F]"
              />
            </div>
            <button
              onClick={() => setActiveSubTab('selling')}
              className="inline-flex items-center gap-2 bg-[#CC9A2E] hover:bg-[#A87C1F] text-[#0F1913] font-bold px-4 py-2.5 rounded text-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Paste New Product Link</span>
            </button>
          </div>

          {/* Products Table */}
          <div className="bg-[#FBFAF5] border border-[#CBCFB9] rounded-lg overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#E4E8D9] text-[#182620] font-bold border-b border-[#CBCFB9]">
                  <tr>
                    <th className="p-3">Product</th>
                    <th className="p-3">Category</th>
                    <th className="p-3">Retail (₹)</th>
                    <th className="p-3">Wholesale (₹)</th>
                    <th className="p-3">Stock</th>
                    <th className="p-3">Online Link</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#CBCFB9]/60">
                  {filteredProducts.map((prod) => {
                    const isEditing = editingProductId === prod.id;

                    return (
                      <tr key={prod.id} className="hover:bg-white/60 transition-colors">
                        <td className="p-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded bg-[#E4E8D9] flex items-center justify-center shrink-0 overflow-hidden">
                              {prod.imageUrl ? (
                                <img
                                  src={prod.imageUrl}
                                  alt={prod.name}
                                  className="w-full h-full object-contain"
                                />
                              ) : (
                                <ProductIcon name={prod.imageIcon} className="w-6 h-6 text-[#3C6656]" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <span className="font-bold text-[#0F1913] block truncate max-w-[200px]">
                                {prod.name}
                              </span>
                              <span className="text-[10px] font-mono text-[#565F52]">
                                {prod.sku} · GST {prod.gstRate}%
                              </span>
                            </div>
                          </div>
                        </td>

                        <td className="p-3">
                          <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-[#E4E8D9] text-[#182620]">
                            {prod.category}
                          </span>
                        </td>

                        <td className="p-3 font-semibold text-[#0F1913]">
                          {formatPrice(prod.price)}
                        </td>

                        <td className="p-3 font-semibold text-[#A87C1F]">
                          {prod.wholesalePrice ? formatPrice(prod.wholesalePrice) : '-'}
                        </td>

                        <td className="p-3">
                          <span
                            className={`font-bold ${
                              prod.stock <= prod.minStockAlert ? 'text-red-700' : 'text-[#3C6656]'
                            }`}
                          >
                            {prod.stock} units
                          </span>
                        </td>

                        <td className="p-3">
                          {prod.productLink ? (
                            <a
                              href={prod.productLink}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[11px] text-[#3C6656] hover:underline flex items-center gap-1 font-mono truncate max-w-[140px]"
                            >
                              <ExternalLink className="w-3 h-3 shrink-0" />
                              <span className="truncate">{prod.productLink}</span>
                            </a>
                          ) : (
                            <span className="text-[11px] text-[#565F52]/60 italic">Store only</span>
                          )}
                        </td>

                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* WhatsApp Direct Selling Link Generator */}
                            <button
                              onClick={() =>
                                copyToClipboard(
                                  `https://wa.me/${company.whatsapp.replace(/[^0-9]/g, '')}?text=${getWhatsAppSellingText(
                                    prod
                                  )}`,
                                  `WhatsApp Link for ${prod.sku}`
                                )
                              }
                              className="p-1.5 bg-[#25D366]/20 hover:bg-[#25D366] text-[#182620] hover:text-white rounded transition-colors"
                              title="Copy WhatsApp Instant Buy Link"
                            >
                              <Share2 className="w-3.5 h-3.5" />
                            </button>

                            {/* Delete Product */}
                            <button
                              onClick={() => {
                                if (confirm(`Delete "${prod.name}" from store catalog?`)) {
                                  deleteProduct(prod.id);
                                  showToast(`Deleted ${prod.name}`);
                                }
                              }}
                              className="p-1.5 bg-red-100 hover:bg-red-600 text-red-700 hover:text-white rounded transition-colors"
                              title="Delete Product"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
