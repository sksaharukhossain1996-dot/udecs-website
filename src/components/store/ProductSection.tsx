import React, { useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { Product } from '../../types';
import { ProductIcon } from '../common/ProductIcon';
import { Plus, Check, Star, Info, ShieldCheck, Tag, Box, ArrowRight } from 'lucide-react';

interface ProductSectionProps {
  selectedCategory: string;
  onSelectCategory: (cat: any) => void;
  onQuickBuy: (product: Product) => void;
  onOpenProductModal: (product: Product) => void;
}

export const ProductSection: React.FC<ProductSectionProps> = ({
  selectedCategory,
  onSelectCategory,
  onQuickBuy,
  onOpenProductModal,
}) => {
  const { products, addToCart, formatPrice, t, language } = useStore();
  const [addedProductId, setAddedProductId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterLowStockOnly, setFilterLowStockOnly] = useState(false);

  const filteredProducts = products.filter((prod) => {
    const matchesCategory =
      selectedCategory === 'all' || prod.category === selectedCategory;
    const matchesSearch =
      prod.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      prod.nameBn.includes(searchQuery) ||
      prod.sku.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStock = filterLowStockOnly ? prod.stock <= prod.minStockAlert : true;
    return matchesCategory && matchesSearch && matchesStock;
  });

  const handleAddToCart = (e: React.MouseEvent, product: Product) => {
    e.stopPropagation();
    addToCart(product, 1, false);
    setAddedProductId(product.id);
    setTimeout(() => setAddedProductId(null), 1500);
  };

  return (
    <section className="py-14 sm:py-20 border-b border-[#CBCFB9]/70" id="products">
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-black text-[#0F1913] tracking-tight font-heading">
              {t('popularProducts')}
            </h2>
            <p className="text-[#565F52] text-sm mt-1.5">
              {language === 'bn'
                ? 'ক্যাটাগরি অনুযায়ী বেছে নিন — প্রতিটি পণ্য গুণমান যাচাই করে তালিকাভুক্ত করা হয়েছে।'
                : 'Select by department — every product is quality inspected with official GST invoices.'}
            </p>
          </div>

          {/* Quick Search inside Section */}
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder={t('searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="text-xs bg-[#FBFAF5] border border-[#CBCFB9] rounded px-3 py-2 text-[#182620] placeholder-[#565F52]/60 focus:outline-none focus:border-[#A87C1F] w-48 sm:w-64"
            />
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-8 no-scrollbar">
          <button
            onClick={() => onSelectCategory('all')}
            className={`px-4 py-2 rounded-full text-xs sm:text-sm font-semibold whitespace-nowrap transition-all ${
              selectedCategory === 'all'
                ? 'bg-[#0F1913] text-white shadow-xs'
                : 'bg-[#FBFAF5] text-[#565F52] border border-[#CBCFB9] hover:border-[#0F1913] hover:text-[#0F1913]'
            }`}
          >
            {t('allProducts')} ({products.length})
          </button>
          <button
            onClick={() => onSelectCategory('kitchen')}
            className={`px-4 py-2 rounded-full text-xs sm:text-sm font-semibold whitespace-nowrap transition-all ${
              selectedCategory === 'kitchen'
                ? 'bg-[#0F1913] text-white shadow-xs'
                : 'bg-[#FBFAF5] text-[#565F52] border border-[#CBCFB9] hover:border-[#0F1913] hover:text-[#0F1913]'
            }`}
          >
            {t('kitchenNav')}
          </button>
          <button
            onClick={() => onSelectCategory('sports')}
            className={`px-4 py-2 rounded-full text-xs sm:text-sm font-semibold whitespace-nowrap transition-all ${
              selectedCategory === 'sports'
                ? 'bg-[#0F1913] text-white shadow-xs'
                : 'bg-[#FBFAF5] text-[#565F52] border border-[#CBCFB9] hover:border-[#0F1913] hover:text-[#0F1913]'
            }`}
          >
            {t('sportsNav')}
          </button>
          <button
            onClick={() => onSelectCategory('wholesale')}
            className={`px-4 py-2 rounded-full text-xs sm:text-sm font-semibold whitespace-nowrap transition-all ${
              selectedCategory === 'wholesale'
                ? 'bg-[#0F1913] text-white shadow-xs'
                : 'bg-[#FBFAF5] text-[#565F52] border border-[#CBCFB9] hover:border-[#0F1913] hover:text-[#0F1913]'
            }`}
          >
            {t('wholesaleNav')}
          </button>
          <button
            onClick={() => onSelectCategory('industrial')}
            className={`px-4 py-2 rounded-full text-xs sm:text-sm font-semibold whitespace-nowrap transition-all ${
              selectedCategory === 'industrial'
                ? 'bg-[#0F1913] text-white shadow-xs'
                : 'bg-[#FBFAF5] text-[#565F52] border border-[#CBCFB9] hover:border-[#0F1913] hover:text-[#0F1913]'
            }`}
          >
            {t('industrialNav')}
          </button>
        </div>

        {/* Product Cards Grid */}
        {filteredProducts.length === 0 ? (
          <div className="text-center py-16 bg-[#FBFAF5] border border-dashed border-[#CBCFB9] rounded p-8">
            <p className="text-[#565F52] text-sm">
              {language === 'bn' ? 'কোনো পণ্য পাওয়া যায়নি।' : 'No products found matching your search criteria.'}
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                onSelectCategory('all');
              }}
              className="mt-3 text-xs text-[#A87C1F] font-semibold underline"
            >
              {language === 'bn' ? 'সব ফিল্টার সাফ করুন' : 'Clear all filters'}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {filteredProducts.map((product) => {
              const isLowStock = product.stock <= product.minStockAlert;
              const isAdded = addedProductId === product.id;

              return (
                <div
                  key={product.id}
                  onClick={() => onOpenProductModal(product)}
                  className="bg-[#FBFAF5] border border-[#CBCFB9] hover:border-[#A87C1F] rounded p-4 sm:p-5 flex flex-col justify-between transition-all duration-200 hover:-translate-y-1 shadow-xs cursor-pointer group"
                >
                  <div>
                    {/* Media container with custom SVG or custom Image URL */}
                    <div className="aspect-square bg-[#E4E8D9] rounded flex items-center justify-center text-[#3C6656] mb-4 relative overflow-hidden group-hover:bg-[#dbe0cf] transition-colors">
                      {product.imageUrl ? (
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          className="w-full h-full object-contain p-2 group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <ProductIcon name={product.imageIcon} className="w-20 h-20 text-[#3C6656] group-hover:scale-110 transition-transform duration-300" />
                      )}
                      
                      {/* Low Stock or Wholesale Tag */}
                      {isLowStock && (
                        <span className="absolute top-2 left-2 bg-[#A87C1F] text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-xs">
                          {language === 'bn' ? 'স্টক সীমিত' : 'Low Stock'}
                        </span>
                      )}
                      {product.category === 'wholesale' && (
                        <span className="absolute top-2 right-2 bg-[#182620] text-[#CC9A2E] text-[10px] font-mono px-2 py-0.5 rounded border border-[#CC9A2E]/30">
                          B2B BULK
                        </span>
                      )}
                      {product.productLink && (
                        <span className="absolute bottom-2 left-2 bg-[#182620]/90 text-[#25D366] text-[9px] font-mono px-1.5 py-0.5 rounded flex items-center gap-1 shadow-xs border border-white/20">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#25D366] animate-pulse"></span>
                          Online Link
                        </span>
                      )}
                    </div>

                    {/* Meta info */}
                    <div className="flex items-center justify-between text-[11px] font-mono-code text-[#565F52] mb-1.5">
                      <span>{product.sku}</span>
                      <span className="flex items-center gap-1 text-[#A87C1F]">
                        <Star className="w-3 h-3 fill-current" />
                        <span className="font-sans font-medium">{product.rating}</span>
                      </span>
                    </div>

                    {/* Title */}
                    <h4 className="text-[14.5px] font-semibold text-[#0F1913] leading-snug mb-2 font-heading group-hover:text-[#3C6656] transition-colors line-clamp-2">
                      {language === 'bn' ? product.nameBn : product.name}
                    </h4>

                    {/* GST & Wholesale info */}
                    <div className="text-[11px] text-[#565F52] mb-3 flex items-center justify-between">
                      <span>HSN: {product.hsn}</span>
                      <span className="text-[10px] bg-[#E4E8D9] px-1.5 py-0.5 rounded text-[#182620]">
                        GST {product.gstRate}%
                      </span>
                    </div>
                  </div>

                  {/* Foot with Price and Action Button */}
                  <div className="pt-3 border-t border-[#CBCFB9]/70 flex items-end justify-between gap-2 mt-2">
                    <div>
                      <div className="text-[11px] text-[#565F52] leading-none mb-1">
                        {language === 'bn' ? 'মূল্য:' : 'Price:'}
                      </div>
                      <span className="font-bold text-[16px] text-[#0F1913] font-sans">
                        {formatPrice(product.price)}
                      </span>
                      {product.wholesalePrice && (
                        <div className="text-[10px] text-[#A87C1F] font-medium leading-none mt-1">
                          {language === 'bn' ? 'পাইকারি:' : 'Wholesale:'} {formatPrice(product.wholesalePrice)} ({product.minWholesaleQty}+)
                        </div>
                      )}
                    </div>

                    {/* Quick Add Button */}
                    <button
                      onClick={(e) => handleAddToCart(e, product)}
                      aria-label="Add to cart"
                      title="Add to shopping cart"
                      className={`w-9 h-9 rounded-full border border-[#0F1913] flex items-center justify-center transition-all shrink-0 ${
                        isAdded
                          ? 'bg-[#3C6656] text-white border-[#3C6656]'
                          : 'bg-transparent hover:bg-[#0F1913] text-[#0F1913] hover:text-white'
                      }`}
                    >
                      {isAdded ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};
