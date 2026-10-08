import {matchCatalog,readProductsByIds} from '../../firebase/catalogIndex';
import { customerProductText, customerProductTitle } from '../../lib/wholesale';
import { wholesaleMinimumQty, wholesaleAvailability } from '../../lib/wholesale';
import React, { useEffect, useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { Product } from '../../types';
import { ProductIcon } from '../common/ProductIcon';
import { Plus, Check, Star, Info, ShieldCheck, Tag, Box, ArrowRight } from 'lucide-react';

interface ProductSectionProps {
  b2bOnly?: boolean;
  selectedCategory: string;
  onSelectCategory: (cat: any) => void;
  onQuickBuy: (product: Product) => void;
  onOpenProductModal: (product: Product) => void;
}

export const ProductSection: React.FC<ProductSectionProps> = ({
  selectedCategory,
  b2bOnly = false,
  onSelectCategory,
  onQuickBuy,
  onOpenProductModal,
}) => {
  const { products, catalogIndex, catalogError, addToCart, formatPrice, t, language } = useStore();
  const [addedProductId, setAddedProductId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterLowStockOnly, setFilterLowStockOnly] = useState(false);

  // Pagination: render catalog in pages so large catalogs do not render all cards at once
  const PAGE_SIZE = 24;
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [selectedCategory, searchQuery, filterLowStockOnly]);

  const paged=!(window as any).__UDECS_STAFF_ENTRY__;
  const [pageProducts,setPageProducts]=useState<Product[]>([]);
  const [pageBusy,setPageBusy]=useState(false);
  const [pageError,setPageError]=useState('');
  const matchingIndex=matchCatalog(catalogIndex,searchQuery,selectedCategory);
  const matchingKey=matchingIndex.map(e=>e.id).join('|');
  useEffect(()=>{
    if(!paged)return;
    let active=true;
    const ids=matchingIndex.slice(0,visibleCount).map(e=>e.id);
    setPageBusy(true);setPageError('');
    setPageProducts(prev=>prev.filter(p=>ids.includes(p.id)));
    const existing=new Map([...products,...pageProducts].map(p=>[p.id,p]));
    const missing=ids.filter(id=>!existing.has(id));
    (async()=>{for(let i=0;i<missing.length;i+=PAGE_SIZE){const batch=await readProductsByIds(missing.slice(i,i+PAGE_SIZE));batch.forEach(p=>existing.set(p.id,p));}if(active)setPageProducts(ids.flatMap(id=>existing.has(id)?[existing.get(id)!]:[]));})().catch(()=>{if(active)setPageError('Products could not be loaded. Please try again later.');}).finally(()=>{if(active)setPageBusy(false);});
    return()=>{active=false;};
  },[matchingKey,visibleCount,products,paged]);
  const localFiltered = products.filter((prod) => {
    if((prod as any).hidden===true)return false;if((prod as any).gatewayVerification===true&&selectedCategory!=='verification')return false;
    const matchesCategory =
      selectedCategory === 'rajkot' ? prod.supplier === 'rajkot' : selectedCategory === 'all' ? prod.supplier !== 'rajkot' : prod.category === selectedCategory && prod.supplier !== 'rajkot';
    const matchesSearch =
      prod.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      prod.nameBn.includes(searchQuery) ||
      prod.sku.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStock = filterLowStockOnly ? prod.stock <= prod.minStockAlert : true;
    return matchesCategory && matchesSearch && matchesStock;
  });

  const filteredProducts=paged?pageProducts:localFiltered;
  const visibleProducts=filteredProducts.slice(0,visibleCount);
  const filteredTotal=paged?matchingIndex.length:filteredProducts.length;
  const retailTotal=paged?catalogIndex.filter(p=>p.supplier!=='rajkot').length:products.filter(p=>p.supplier!=='rajkot'&&!(p as any).hidden&&!(p as any).gatewayVerification).length;

  const handleAddToCart = (e: React.MouseEvent, product: Product) => {
    e.stopPropagation();
    addToCart(product, 1, false);
    setAddedProductId(product.id);
    setTimeout(() => setAddedProductId(null), 1500);
  };

  return (
    <section className="py-10 sm:py-14 border-b border-[#CBCFB9]/70" id="products">
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-black text-[#0F1913] tracking-tight font-heading">
              {selectedCategory === 'rajkot' ? 'UDECS B2B Wholesale' : t('popularProducts')}
            </h2>
            <p className="text-[#565F52] text-sm mt-1.5">
              {selectedCategory === 'rajkot' ? 'For resellers. Minimum 100 pieces per product, rounded up to full cartons. Existing listed wholesale prices; shipping quoted before payment.' : language === 'bn'
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

        {!b2bOnly && <>
        {/* Supplier-only B2B view, no catalog mutations */}
        <div className="mb-4"><button onClick={() => onSelectCategory('rajkot')} aria-pressed={selectedCategory === 'rajkot'} className={`px-4 py-3 rounded-lg text-sm font-bold border ${selectedCategory === 'rajkot' ? 'bg-[#0F1913] text-white' : 'bg-[#FBFAF5] text-[#182620] border-[#CBCFB9]'}`}>UDECS B2B Wholesale</button></div>
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
            {t('allProducts')} ({retailTotal})
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
            onClick={() => onSelectCategory('rajkot')}
            className={`px-4 py-2 rounded-full text-xs sm:text-sm font-semibold whitespace-nowrap transition-all ${
              selectedCategory === 'rajkot'
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

        </>}
        {/* Product Cards Grid */}
        {filteredTotal === 0 && !pageBusy && !catalogError && !pageError ? (
          <div className="text-center py-16 bg-[#FBFAF5] border border-dashed border-[#CBCFB9] rounded p-8">
            <p className="text-[#565F52] text-sm">
              {language === 'bn' ? 'কোনো পণ্য পাওয়া যায়নি।' : 'No products found matching your search criteria.'}
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                onSelectCategory(b2bOnly ? 'rajkot' : 'all');
              }}
              className="mt-3 text-xs text-[#A87C1F] font-semibold underline"
            >
              {language === 'bn' ? 'সব ফিল্টার সাফ করুন' : 'Clear all filters'}
            </button>
          </div>
        ) : (
          <>{(catalogError||pageError)&&<p role="alert" className="p-4 text-red-700">{catalogError||pageError}</p>}<div className="grid grid-cols-2 min-[560px]:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2.5 sm:gap-3">
            {visibleProducts.map((product) => {
              const isLowStock = product.stockManaged !== false && product.stock <= product.minStockAlert;
              const isAdded = addedProductId === product.id;

              return (
                <div
                  key={product.id}
                  onClick={() => onOpenProductModal(product)}
                  className="bg-white border border-[#CBCFB9]/70 hover:border-[#A87C1F] rounded-xl p-2.5 sm:p-3 flex flex-col justify-between transition-all duration-200 hover:shadow-md cursor-pointer group min-w-0"
                >
                  <div>
                    {/* Media container with custom SVG or custom Image URL */}
                    <div className="aspect-square bg-[#F4F5EF] rounded-lg flex items-center justify-center text-[#3C6656] mb-2.5 relative overflow-hidden group-hover:bg-[#E4E8D9] transition-colors">
                      {product.imageUrl && product.id!=='23065_plastic_toothbrush_holder_1pc' ? (
                        <img
                          src={product.imageUrl}
                          alt={customerProductTitle(product, language)}
                          className="w-full h-full object-contain p-2 group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <ProductIcon name={product.imageIcon} className="w-14 h-14 text-[#3C6656] group-hover:scale-110 transition-transform duration-300" />
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
                      {product.supplier !== 'rajkot' && product.productLink && (
                        <span className="absolute bottom-2 left-2 bg-[#182620]/90 text-[#25D366] text-[9px] font-mono px-1.5 py-0.5 rounded flex items-center gap-1 shadow-xs border border-white/20">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#25D366] animate-pulse"></span>
                          Online Link
                        </span>
                      )}
                    </div>

                    {/* Meta info */}
                    <div className="flex items-center justify-between text-[9px] sm:text-[10px] font-mono-code text-[#565F52] mb-1.5 gap-1 min-w-0">
                      <span className="truncate" title={product.sku}>{product.sku}</span>
                      <span className="flex items-center gap-0.5 text-[#A87C1F] shrink-0">
                        <Star className="w-3 h-3 fill-current" />
                        <span className="font-sans font-medium">{product.rating}</span>
                      </span>
                    </div>

                    {/* Title */}
                    <h4 className="text-[12px] sm:text-[13px] font-semibold text-[#0F1913] leading-[1.4] mb-2 min-h-[2.8em] font-heading group-hover:text-[#3C6656] transition-colors line-clamp-2">
                      {customerProductTitle(product, language)}
                    </h4>

                    {/* GST & Wholesale info */}
                    <div className="text-[9px] text-[#565F52] mb-2 flex flex-wrap items-center justify-between gap-1">
                      <span>{(product as any).gatewayVerification?'Owner verification only - no delivery':`HSN: ${product.hsn}`}</span>
                      <span className="text-[10px] bg-[#E4E8D9] px-1.5 py-0.5 rounded text-[#182620]">
                        {(product as any).gatewayVerification?'No tax invoice':`GST ${product.gstRate}%`}
                      </span>
                    </div>
                  </div>

                  {/* Foot with Price and Action Button */}
                  <div className="pt-2 border-t border-[#CBCFB9]/50 flex flex-wrap items-end justify-between gap-1.5 mt-1">
                    <div className="min-w-0 flex-1">
                      <div className="text-[10px] text-[#565F52] leading-none mb-1">
                        {product.supplier==='rajkot'&&product.gstExtra ? 'Per piece (GST extra):' : language === 'bn' ? 'মূল্য:' : 'Price:'}
                      </div>
                      {product.originalPrice && product.originalPrice > product.price && (
                        <span className="text-[11.5px] text-[#8A9184] line-through leading-none block mb-0.5">
                          {formatPrice(product.originalPrice)}
                        </span>
                      )}
                      <span className="font-bold text-[15px] sm:text-[16px] text-[#0F1913] font-sans">
                        {product.supplier === 'rajkot' ? new Intl.NumberFormat('en-IN', {style:'currency',currency:'INR',minimumFractionDigits:2}).format(product.wholesalePrice) : formatPrice(product.price)}
                      </span>
                      {product.originalPrice && product.originalPrice > product.price && (
                        <span className="ml-1 align-middle text-[8px] font-bold bg-[#3C6656] text-white px-1.5 py-0.5 rounded whitespace-nowrap inline-block">
                          {Math.round((1 - product.price / product.originalPrice) * 100)}% OFF
                        </span>
                      )}
                      {!(product as any).gatewayVerification&&product.wholesalePrice && (product.supplier==='rajkot'||product.minWholesaleQty>1) && (
                        <div className="text-[10px] text-[#A87C1F] font-medium leading-none mt-1">
                          {language === 'bn' ? 'পাইকারি:' : 'Wholesale:'} {product.supplier === 'rajkot' ? new Intl.NumberFormat('en-IN', {style:'currency',currency:'INR',minimumFractionDigits:2}).format(product.wholesalePrice) : formatPrice(product.wholesalePrice)} ({product.supplier === 'rajkot' ? `Min ${wholesaleMinimumQty(product)} pcs / product` : product.minimumOrderQty ? `Min ${product.minimumOrderQty} pcs` : `${product.minWholesaleQty}+`})
                        </div>
                      )}
                    </div>

                    {/* Quick Add Button */}
                    <button
                      disabled={!wholesaleAvailability(product)}
                      onClick={(e) => handleAddToCart(e, product)}
                      aria-label="Add to cart"
                      title="Add to shopping cart"
                      className={`w-11 h-11 rounded-lg border border-[#0F1913] flex items-center justify-center transition-all shrink-0 ${
                        isAdded
                          ? 'bg-[#3C6656] text-white border-[#3C6656]'
                          : 'bg-[#0F1913] hover:bg-[#3C6656] text-[#CC9A2E] hover:text-white'
                      }`}
                    >
                      {isAdded ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              );
            })}
          </div></>
        )}
        {visibleCount < filteredTotal && (
          <div className="mt-8 flex flex-col items-center gap-2">
            <p className="text-xs text-[#565F52]">
              {language === 'bn'
                ? `দেখানো হচ্ছে ${visibleProducts.length} / ${filteredTotal}টি পণ্য`
                : `Showing ${visibleProducts.length} of ${filteredTotal} products`}
            </p>
            <button
              disabled={pageBusy||!!pageError} onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
              className="px-6 py-2.5 rounded-full border border-[#0F1913] text-sm font-semibold text-[#0F1913] hover:bg-[#0F1913] hover:text-white transition-all"
            >
              {language === 'bn' ? 'আরও পণ্য দেখুন' : 'Show more products'}
            </button>
          </div>
        )}
      </div>
    </section>
  );
};
