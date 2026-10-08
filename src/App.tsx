import {CUSTOMER_SUPPORT_ENABLED} from './customer-stage/featureFlags';
import {PublicCustomerPortal} from './customer-stage/PublicCustomerPortal';
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import './visual-redesign.css';
import { StoreProvider, useStore } from './context/StoreContext';
import { Navbar } from './components/store/Navbar';
import { Hero } from './components/store/Hero';
import { CategoryMosaic } from './components/store/CategoryMosaic';
import { ProductSection } from './components/store/ProductSection';
import { WholesaleSection } from './components/store/WholesaleSection';
import { Footer } from './components/store/Footer';
import { ProductDetailModal } from './components/store/ProductDetailModal';
import { CartDrawer } from './components/store/CartDrawer';
import { CheckoutModal } from './components/store/CheckoutModal';
import { OrderTrackingModal } from './components/store/OrderTrackingModal';
import { SearchModal } from './components/store/SearchModal';
import { AdminPortal } from './components/admin/AdminPortal';
import { WhatsAppAIChat } from './components/common/WhatsAppAIChat';
import { LiveVoiceModal } from './components/common/LiveVoiceModal';
import { Product, Order } from './types';

const StoreContent: React.FC = () => {
  const isB2bPage = typeof window !== 'undefined' && window.location.pathname === '/b2b.html';
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isTrackingOpen, setIsTrackingOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState<boolean>(() => typeof window !== 'undefined' && (window as any).__UDECS_STAFF_ENTRY__ === true);
  const [isVoiceOpen, setIsVoiceOpen] = useState(false);
  const [selectedProductModal, setSelectedProductModal] = useState<Product | null>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [checkoutDirectItem, setCheckoutDirectItem] = useState<{
    product: Product;
    quantity: number;
    isWholesale: boolean;
  } | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<
    'all' | 'kitchen' | 'sports' | 'wholesale' | 'industrial' | 'rajkot'
  >(isB2bPage ? 'rajkot' : 'all');

  useEffect(()=>{const route=()=>{const raw=new URLSearchParams(window.location.hash.split('?')[1]||'').get('category');const cat=raw==='b2b'?'rajkot':raw;if(cat&&['kitchen','sports','industrial','wholesale','rajkot','verification'].includes(cat)){setSelectedCategory(cat as 'kitchen'|'sports'|'industrial'|'wholesale'|'rajkot');document.getElementById('products')?.scrollIntoView({behavior:'smooth'});}};route();window.addEventListener('hashchange',route);return()=>window.removeEventListener('hashchange',route);},[]);

  const handleQuickCheckout = (
    product: Product,
    quantity: number,
    isWholesale: boolean
  ) => {
    setCheckoutDirectItem({ product, quantity, isWholesale });
    setIsCheckoutOpen(true);
  };

  const handleCartProceedCheckout = () => {
    setCheckoutDirectItem(null);
    setIsCheckoutOpen(true);
  };

  if(CUSTOMER_SUPPORT_ENABLED && new URLSearchParams(window.location.search).has('customer-portal'))return <PublicCustomerPortal/>;
  return (
    <div className="visual-store min-h-screen flex flex-col bg-[#EEF0E7] text-[#0F1913] font-sans selection:bg-[#CC9A2E] selection:text-white" id="top">
      {/* Top Navbar */}
      <Navbar
        onOpenCart={() => setIsCartOpen(true)}
        onOpenTracking={() => setIsTrackingOpen(true)}
        onOpenSearch={() => setIsSearchOpen(true)}
        onOpenAdmin={() => setIsAdminOpen(true)}
        onOpenVoice={() => setIsVoiceOpen(true)}
      />

      {/* Main Storefront Body */}
      <main className="flex-1">
        {/* Architectural Hero */}
        {!isB2bPage && <Hero
          onOpenTracking={() => setIsTrackingOpen(true)}
          onOpenVoice={() => setIsVoiceOpen(true)}
        />}
        {isB2bPage && <section className="p-6 sm:p-12 bg-[#101e34] text-white"><div className="max-w-[1240px] mx-auto"><a href="/" className="text-sm underline">Retail storefront</a><h1 className="text-3xl sm:text-5xl font-black mt-5">UDECS B2B Wholesale</h1><p className="mt-4 max-w-2xl">Wholesale products and quotations for shops, resellers and business buyers. Minimum 100 pieces per product, rounded up to full cartons. GST extra; shipping and availability confirmed before payment.</p><a href="#wholesale" className="inline-block mt-5 rounded-lg bg-[#CC9A2E] text-[#0F1913] px-5 py-3 font-bold">Request a quotation</a></div></section>}

        {/* Category Mosaic */}
        {!isB2bPage && <CategoryMosaic
          onSelectCategory={(cat) => {
            setSelectedCategory(cat);
            const el = document.getElementById('products');
            el?.scrollIntoView({ behavior: 'smooth' });
          }}
        />}

        {/* Product Catalog Section */}
        <ProductSection
          b2bOnly={isB2bPage}
          selectedCategory={isB2bPage ? 'rajkot' : selectedCategory}
          onSelectCategory={setSelectedCategory}
          onQuickBuy={(prod) => handleQuickCheckout(prod, 1, false)}
          onOpenProductModal={(prod) => setSelectedProductModal(prod)}
        />

        {/* Wholesale & B2B Sourcing Section */}
        <WholesaleSection standalone={isB2bPage} />
        {isB2bPage && <section className="max-w-[1240px] mx-auto p-6 sm:p-12 space-y-5"><h2 className="text-2xl font-bold">B2B order terms</h2><h3 className="font-bold">Payment and shipping</h3><p>Eligible payment options and shipping charges are confirmed with the final quotation before payment. COD is paused. Delivery is estimated within 5-7 days after dispatch, subject to PIN serviceability and availability.</p><h3 className="font-bold">Cancellation before dispatch</h3><p>Cancel before dispatch via Mysa WhatsApp +91 9845485437 with your order number. Paid orders cancelled before dispatch receive a refund in 5-7 days.</p><h3 className="font-bold">After dispatch: no voluntary return or refund</h3><p>The retail 7-day unused-product offer does not apply to B2B wholesale. Statutory rights and remedies that cannot lawfully be excluded remain unaffected. Contact UDECS if goods are wrong, defective, damaged or not as described.</p><p>Business support: Mysa WhatsApp +91 9845485437. Grievance designation: UDECS Business Product Manager. Complaints acknowledged within 48 hours and redressed within one month.</p><a href="/terms-and-conditions.html" className="underline">Terms and conditions</a></section>}
      </main>

      {/* Storefront Footer */}
      <Footer
        onOpenTracking={() => setIsTrackingOpen(true)}
        onOpenAdmin={() => setIsAdminOpen(true)}
      />

      {/* Interactive Modals & Drawers */}
      <ProductDetailModal
        product={selectedProductModal}
        onClose={() => setSelectedProductModal(null)}
        onQuickCheckout={handleQuickCheckout}
      />

      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        onProceedCheckout={handleCartProceedCheckout}
      />

      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => {
          setIsCheckoutOpen(false);
          setCheckoutDirectItem(null);
        }}
        directItem={checkoutDirectItem}
        onOrderSuccess={(order: Order) => {
          // Keep completed order screen open inside modal for invoice printing
        }}
      />

      <OrderTrackingModal
        isOpen={isTrackingOpen}
        onClose={() => setIsTrackingOpen(false)}
      />

      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectProduct={(product) => setSelectedProductModal(product)}
      />

      {/* Full Admin & ERP Suite (RBAC, Inventory, GST reports, Attendance, Salary slip generator) */}
      <AdminPortal
        isOpen={isAdminOpen}
        onClose={() => setIsAdminOpen(false)}
      />

      {/* WhatsApp AI Customer Support Widget with Voice Switcher */}
      <WhatsAppAIChat onOpenVoice={() => setIsVoiceOpen(true)} />

      {/* Gemini Live Voice Assistant Modal */}
      <LiveVoiceModal
        isOpen={isVoiceOpen}
        onClose={() => setIsVoiceOpen(false)}
      />
    </div>
  );
};

export default function App() {
  return (
    <StoreProvider>
      <StoreContent />
    </StoreProvider>
  );
}
