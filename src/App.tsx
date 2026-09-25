/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
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
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isTrackingOpen, setIsTrackingOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isVoiceOpen, setIsVoiceOpen] = useState(false);
  const [selectedProductModal, setSelectedProductModal] = useState<Product | null>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [checkoutDirectItem, setCheckoutDirectItem] = useState<{
    product: Product;
    quantity: number;
    isWholesale: boolean;
  } | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<
    'all' | 'kitchen' | 'sports' | 'wholesale' | 'industrial'
  >('all');

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

  return (
    <div className="min-h-screen flex flex-col bg-[#EEF0E7] text-[#0F1913] font-sans selection:bg-[#CC9A2E] selection:text-white" id="top">
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
        <Hero
          onOpenTracking={() => setIsTrackingOpen(true)}
          onOpenVoice={() => setIsVoiceOpen(true)}
        />

        {/* Category Mosaic */}
        <CategoryMosaic
          onSelectCategory={(cat) => {
            setSelectedCategory(cat);
            const el = document.getElementById('products');
            el?.scrollIntoView({ behavior: 'smooth' });
          }}
        />

        {/* Product Catalog Section */}
        <ProductSection
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
          onQuickBuy={(prod) => handleQuickCheckout(prod, 1, false)}
          onOpenProductModal={(prod) => setSelectedProductModal(prod)}
        />

        {/* Wholesale & B2B Sourcing Section */}
        <WholesaleSection />
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
