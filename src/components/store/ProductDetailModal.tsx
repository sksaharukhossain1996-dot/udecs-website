import React, { useState } from 'react';
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
  const [quantity, setQuantity] = useState(1);
  const [isAdded, setIsAdded] = useState(false);

  if (!product) return null;

  const isEligibleWholesale = quantity >= product.minWholesaleQty;
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0F1913]/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-[#FBFAF5] border border-[#CBCFB9] rounded-lg max-w-2xl w-full p-6 sm:p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto">
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
          <div className="sm:col-span-5 bg-[#E4E8D9] rounded-md p-6 flex flex-col items-center justify-center border border-[#CBCFB9] text-[#3C6656] min-h-[220px]">
            {product.imageUrl ? (
              <img
                src={product.imageUrl}
                alt={product.name}
                className="w-44 h-44 object-contain"
              />
            ) : (
              <ProductIcon name={product.imageIcon} className="w-32 h-32 text-[#3C6656]" />
            )}
            <div className="mt-4 text-center">
              <span className="text-[11px] font-mono font-bold text-[#A87C1F] block">
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
          <div className="sm:col-span-7 flex flex-col">
            <div className="flex items-center gap-1 text-[#A87C1F] text-xs font-semibold mb-1">
              <Star className="w-3.5 h-3.5 fill-current" />
              <span>{product.rating}</span>
              <span className="text-[#565F52]">({product.reviewsCount} reviews)</span>
            </div>

            <h3 className="text-xl sm:text-2xl font-black text-[#0F1913] font-heading mb-2">
              {language === 'bn' ? product.nameBn : product.name}
            </h3>

            <p className="text-sm text-[#565F52] leading-relaxed mb-4">
              {language === 'bn' ? product.descriptionBn : product.description}
            </p>

            {/* Pricing Box */}
            <div className="bg-[#EEF0E7] p-3.5 rounded border border-[#CBCFB9] mb-4">
              <div className="flex items-baseline justify-between">
                <div>
                  <span className="text-xs text-[#565F52] block">
                    {isEligibleWholesale
                      ? language === 'bn'
                        ? 'পাইকারি ইউনিট রেট প্রয়োগ করা হয়েছে'
                        : 'Wholesale Tier Applied'
                      : language === 'bn'
                      ? 'খুচরা মূল্য (GST সহ)'
                      : 'Retail Price (Incl. GST)'}
                  </span>
                  <span className="text-2xl font-black text-[#0F1913]">
                    {formatPrice(activeUnitPrice)}
                  </span>
                  {isEligibleWholesale && (
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

            {/* Quantity Selector */}
            <div className="flex items-center gap-3 mb-6">
              <span className="text-xs font-semibold text-[#0F1913]">
                {language === 'bn' ? 'পরিমাণ:' : 'Quantity:'}
              </span>
              <div className="flex items-center border border-[#CBCFB9] rounded bg-[#FBFAF5]">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="p-1.5 hover:bg-[#E4E8D9] text-[#0F1913] transition-colors"
                  aria-label="Decrease quantity"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="w-10 text-center font-bold text-sm text-[#0F1913]">
                  {quantity}
                </span>
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="p-1.5 hover:bg-[#E4E8D9] text-[#0F1913] transition-colors"
                  aria-label="Increase quantity"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              <span className="text-xs text-[#565F52]">
                {product.stock > 0
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
                disabled={product.stock <= 0}
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
                disabled={product.stock <= 0}
                className="flex-1 bg-[#CC9A2E] hover:bg-[#A87C1F] disabled:bg-gray-400 text-[#0F1913] hover:text-white py-3 px-4 rounded text-sm font-semibold flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
              >
                <CreditCard className="w-4 h-4" />
                <span>{language === 'bn' ? 'PayU দিয়ে এখনই কিনুন' : 'Buy Now with PayU'}</span>
              </button>
            </div>

            {/* Trust highlights */}
            <div className="mt-5 pt-3 border-t border-[#CBCFB9]/60 flex items-center justify-between text-[11px] text-[#565F52]">
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-[#3C6656]" />
                {language === 'bn' ? '৭ দিনের রিপ্লেসমেন্ট ওয়ারেন্টি' : '7-Day Return Guarantee'}
              </span>
              <span className="flex items-center gap-1">
                <Truck className="w-3.5 h-3.5 text-[#3C6656]" />
                {language === 'bn' ? 'দ্রুত কুরিয়ার ট্র্যাকিং' : 'Fast Tracked Delivery'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
