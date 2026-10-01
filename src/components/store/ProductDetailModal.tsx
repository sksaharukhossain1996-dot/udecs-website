import { wholesaleAvailability } from '../../lib/wholesale';
import React, { useState, useEffect } from 'react';
import { useStore } from '../../context/StoreContext';
import { Product } from '../../types';
import { ProductIcon } from '../common/ProductIcon';
import { X, Check, Star, ShieldCheck, Truck, ArrowRight, Minus, Plus, CreditCard, Box, ExternalLink, Phone } from 'lucide-react';

interface ProductDetailModalProps {
  product: Product | null;
  onClose: () => void;
  onQuickCheckout: (product: Product, quantity: number, isWholesale: boolean) => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product,
  onClose,
  onQuickCheckout,
}) => {
  const { addToCart, formatPrice, language, company } = useStore();
  const [photoIndex,setPhotoIndex]=useState(0);
  useEffect(()=>setPhotoIndex(0),[product?.id]);
  const [quantity, setQuantity] = useState(1);
  const [isAdded, setIsAdded] = useState(false);

  const [viewport, setViewport] = useState(() => ({ width: document.documentElement.clientWidth, height: window.visualViewport?.height || window.innerHeight }));
  useEffect(() => {
    const resize = () => setViewport({ width: document.documentElement.clientWidth, height: window.visualViewport?.height || window.innerHeight });
    window.addEventListener('resize', resize);
    window.visualViewport?.addEventListener('resize', resize);
    return () => { window.removeEventListener('resize', resize); window.visualViewport?.removeEventListener('resize', resize); };
  }, []);

  useEffect(() => { setQuantity(product?.minimumOrderQty || 1); }, [product?.id]);
  if (!product) return null;
  const canOrder = wholesaleAvailability(product);

  const isEligibleWholesale = quantity >= product.minWholesaleQty;
  const hasWholesaleDiscount = isEligibleWholesale && product.wholesalePrice < product.price;
  const activeUnitPrice = isEligibleWholesale ? product.wholesalePrice : product.price;
  const totalPrice = activeUnitPrice * quantity;

  const handleAddToCart = () => {
    addToCart(product, quantity, isEligibleWholesale);
    setIsAdded(true);
    setTimeout(() => {
      setIsAdded(false);
      onClose();
    }, 900);
  };

  return (
    <div style={{ width: viewport.width, height: viewport.height }} className="fixed top-0 left-0 z-50 flex items-center justify-center p-4 bg-[#0F1913]/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-[#FBFAF5] border border-[#CBCFB9] rounded-lg max-w-2xl w-full min-w-0 p-4 sm:p-6 sm:p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto overflow-x-hidden">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-[#565F52] hover:text-[#0F1913] hover:bg-[#E4E8D9] rounded-full transition-colors"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 items-start">
          {/* Media preview */}
          <div className="sm:col-span-5 min-w-0 bg-[#E4E8D9] rounded-md p-6 flex flex-col items-center justify-center border border-[#CBCFB9] text-[#3C6656] min-h-[220px]">
            {product.imageUrl ? (
              <img
                src={product.photos?.[photoIndex] || product.imageUrl}
                alt={product.name}
                className="w-44 h-44 object-contain"
              />
            ) : (
              <ProductIcon name={product.imageIcon} className="w-32 h-32 text-[#3C6656]" />
            )}
            {product.photos && product.photos.length>1 && <div className="flex gap-2 mt-3">{product.photos.map((src,i)=><button key={i} aria-label={'View photo '+(i+1)} onClick={()=>setPhotoIndex(i)} className={'border rounded p-1 '+(photoIndex===i?'border-blue-700':'border-slate-300')}><img src={src} alt="" className="w-12 h-12 object-contain"/></button>)}</div>}
            <div className="mt-4 text-center w-full min-w-0">
              <span className="text-[11px] font-mono font-bold text-[#A87C1F] block break-all">
                {product.sku}
              </span>
              <span className="text-[11px] text-[#565F52]">
                HSN: {product.hsn} · GST {product.gstRate}%
              </span>
              {product.productLink && (
                <div className="mt-2">
                  <a
                    href={product.productLink}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] text-[#3C6656] hover:underline font-semibold"
                  >
                    <span>View Sourced Link</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Details */}
          <div className="sm:col-span-7 min-w-0 flex flex-col">
            <div className="flex items-center gap-1 text-[#A87C1F] text-xs font-semibold mb-1">
              <Star className="w-3.5 h-3.5 fill-current" />
              <span>{product.rating}</span>
              <span className="text-[#565F52]">({product.reviewsCount} reviews)</span>
            </div>

            <h3 className="text-xl sm:text-2xl font-black text-[#0F1913] font-heading mb-2 break-words">
              {language === 'bn' ? product.nameBn : product.name}
            </h3>

            <p className="text-sm text-[#565F52] leading-relaxed mb-4 break-words">
              {language === 'bn' ? product.descriptionBn : product.description}
            </p>

            {/* Pricing Box */}
            <div className="bg-[#EEF0E7] p-3.5 rounded border border-[#CBCFB9] mb-4">
              <div className="flex flex-wrap gap-2 items-baseline justify-between">
                <div>
                  <span className="text-xs text-[#565F52] block">
                    {hasWholesaleDiscount
                      ? language === 'bn'
                        ? 'পাইকারি ইউনিট রেট প্রয়োগ করা হয়েছে'
                        : 'Wholesale Tier Applied'
                      : language === 'bn'
                      ? 'মূল্য (GST অতিরিক্ত)'
                      : 'Price (GST extra)'}
                  </span>
                  <span className="text-2xl font-black text-[#0F1913]">
                    {formatPrice(activeUnitPrice)}
                  </span>
                  {!isEligibleWholesale && product.originalPrice && product.originalPrice > product.price && (
                    <span className="ml-2 text-sm line-through text-[#565F52]">
                      {formatPrice(product.originalPrice)}
                    </span>
                  )}
                  {!isEligibleWholesale && product.originalPrice && product.originalPrice > product.price && (
                    <span className="ml-2 align-middle text-[10px] font-bold bg-[#3C6656] text-white px-1.5 py-0.5 rounded whitespace-nowrap">
                      {Math.round((1 - product.price / product.originalPrice) * 100)}% OFF
                    </span>
                  )}
                  {hasWholesaleDiscount && (
                    <span className="ml-2 text-xs line-through text-[#565F52]">
                      {formatPrice(product.price)}
                    </span>
                  )}
                </div>

                <div className="text-right">
                  <span className="text-xs text-[#565F52] block">
                    {language === 'bn' ? 'মোট মূল্য:' : 'Subtotal:'}
                  </span>
                  <span className="text-lg font-bold text-[#3C6656]">
                    {formatPrice(totalPrice)}
                  </span>
                </div>
              </div>

              {/* Wholesale notification note */}
              {product.minWholesaleQty > 1 && (
                <div className="mt-2 pt-2 border-t border-[#CBCFB9] text-xs flex items-center justify-between text-[#565F52]">
                  <span className="flex items-center gap-1 text-[#A87C1F] font-medium">
                    <Box className="w-3 h-3" />
                    {language === 'bn'
                      ? `পাইকারি অফার: ${product.minWholesaleQty}+ পিসে প্রতিটি মাত্র ${formatPrice(product.wholesalePrice)}`
                      : `Wholesale Offer: ${formatPrice(product.wholesalePrice)}/unit for ${product.minWholesaleQty}+ units`}
                  </span>
                  {!isEligibleWholesale && (
                    <button
                      onClick={() => setQuantity(product.minWholesaleQty)}
                      className="text-[11px] font-bold text-[#0F1913] underline hover:text-[#A87C1F]"
                    >
                      {language === 'bn' ? 'পাইকারিতে যোগ করুন' : 'Apply Wholesale Qty'}
                    </button>
                  )}
                </div>
              )}
            </div>

            {product.shippingMode === 'quote' && <p className="text-xs text-[#565F52] mb-3">Minimum order: {product.minimumOrderQty} pcs. Price is per piece, GST extra. Shipping quoted separately before payment. No carton piece-count assumed.</p>}
            {/* Quantity Selector */}
            <div className="flex flex-wrap items-center gap-3 mb-6">
              <span className="text-xs font-semibold text-[#0F1913]">
                {language === 'bn' ? 'পরিমাণ:' : 'Quantity:'}
              </span>
              <div className="flex items-center border border-[#CBCFB9] rounded bg-[#FBFAF5]">
                <button
                  onClick={() => setQuantity(Math.max(product.minimumOrderQty || 1, quantity - (product.quantityStep || 1)))}
                  className="p-1.5 hover:bg-[#E4E8D9] text-[#0F1913] transition-colors"
                  aria-label="Decrease quantity"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="w-10 text-center font-bold text-sm text-[#0F1913]">
                  {quantity}
                </span>
                <button
                  onClick={() => setQuantity(quantity + (product.quantityStep || 1))}
                  className="p-1.5 hover:bg-[#E4E8D9] text-[#0F1913] transition-colors"
                  aria-label="Increase quantity"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              <span className="text-xs text-[#565F52]">
                {product.stockManaged === false ? (product.supplierInStock ? 'Supplier in stock - availability confirmed on order' : 'Supplier out of stock') : product.stock > 0
                  ? `${product.stock} ${language === 'bn' ? 'ইউনিট স্টকে আছে' : 'units in stock'}`
                  : language === 'bn'
                  ? 'স্টক শেষ'
                  : 'Out of stock'}
              </span>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleAddToCart}
                disabled={!canOrder}
                className="flex-1 bg-[#0F1913] hover:bg-[#182620] disabled:bg-gray-400 text-white py-3 px-4 rounded text-sm font-semibold flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
              >
                {isAdded ? <Check className="w-4 h-4 text-[#CC9A2E]" /> : null}
                <span>
                  {isAdded
                    ? language === 'bn'
                      ? 'কার্টে যোগ হয়েছে!'
                      : 'Added to Cart!'
                    : language === 'bn'
                    ? 'কার্টে যোগ করুন'
                    : 'Add to Cart'}
                </span>
              </button>

              <button
                onClick={() => {
                  onClose();
                  onQuickCheckout(product, quantity, isEligibleWholesale);
                }}
                disabled={!canOrder}
                className="flex-1 bg-[#CC9A2E] hover:bg-[#A87C1F] disabled:bg-gray-400 text-[#0F1913] hover:text-white py-3 px-4 rounded text-sm font-semibold flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
              >
                <CreditCard className="w-4 h-4" />
                <span>{product.shippingMode === 'quote' ? 'Order - shipping quoted separately' : language === 'bn' ? 'এখনই কিনুন' : 'Buy Now'}</span>
              </button>
            </div>

            {/* Trust highlights */}
            <div className="mt-5 pt-3 border-t border-[#CBCFB9]/60 flex items-center justify-between flex-wrap gap-2 text-[11px] text-[#565F52]">
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-[#3C6656]" />
                {product.supplier === 'rajkot' ? 'Terms confirmed with your order' : language === 'bn' ? '৭ দিনের রিপ্লেসমেন্ট ওয়ারেন্টি' : '7-Day Return Guarantee'}
              </span>
              <span className="flex items-center gap-1">
                <Truck className="w-3.5 h-3.5 text-[#3C6656]" />
                {product.shippingMode === 'quote' ? 'Shipping quoted before payment' : language === 'bn' ? 'দ্রুত কুরিয়ার ট্র্যাকিং' : 'Fast Tracked Delivery'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
