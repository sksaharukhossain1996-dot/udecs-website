import React from 'react';
import { useStore } from '../../context/StoreContext';
import { ProductIcon } from '../common/ProductIcon';
import { X, Trash2, Plus, Minus, ArrowRight, ShieldCheck, ShoppingBag } from 'lucide-react';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onProceedCheckout: () => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  onProceedCheckout,
}) => {
  const { cart, removeFromCart, updateCartQty, cartSubtotal, formatPrice, t, language } =
    useStore();

  if (!isOpen) return null;

  // Approximate GST (inclusive in display, shown clearly for transparency)
  const estimatedTaxable = Math.round(cartSubtotal / 1.18);
  const estimatedGst = cartSubtotal - estimatedTaxable;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden animate-fadeIn">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-[#0F1913]/50 backdrop-blur-xs transition-opacity"
      />

      {/* Slide-over panel */}
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-[#FBFAF5] border-l border-[#CBCFB9] shadow-2xl flex flex-col">
          {/* Header */}
          <div className="p-5 border-b border-[#CBCFB9] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-[#3C6656]" />
              <h3 className="font-heading font-bold text-lg text-[#0F1913]">
                {t('cartTitle')} ({cart.length})
              </h3>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-[#E4E8D9] text-[#565F52] hover:text-[#0F1913] transition-colors"
              aria-label="Close cart drawer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Cart Items */}
          <div className="flex-1 overflow-y-auto p-5 divide-y divide-[#CBCFB9]/70">
            {cart.length === 0 ? (
              <div className="py-16 text-center text-[#565F52]">
                <ShoppingBag className="w-12 h-12 mx-auto text-[#CBCFB9] mb-3" />
                <p className="text-sm font-medium">{t('emptyCart')}</p>
                <button
                  onClick={onClose}
                  className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-[#A87C1F] hover:underline"
                >
                  <span>{t('viewCollection')}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              cart.map(({ product, quantity, isWholesale }) => {
                const isWholesaleApplied =
                  isWholesale || quantity >= product.minWholesaleQty;
                const unitPrice = isWholesaleApplied
                  ? product.wholesalePrice
                  : product.price;
                const itemTotal = unitPrice * quantity;

                return (
                  <div key={product.id} className="py-4 flex gap-3.5 items-center">
                    <div className="w-16 h-16 rounded bg-[#E4E8D9] flex items-center justify-center text-[#3C6656] shrink-0 border border-[#CBCFB9]">
                      <ProductIcon name={product.imageIcon} className="w-9 h-9 text-[#3C6656]" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-xs font-semibold text-[#0F1913] truncate font-heading">
                          {language === 'bn' ? product.nameBn : product.name}
                        </h4>
                        <button
                          onClick={() => removeFromCart(product.id)}
                          className="text-[#565F52] hover:text-red-700 p-0.5"
                          title="Remove item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="text-[11px] text-[#565F52] mt-0.5">
                        SKU: {product.sku}
                        {isWholesaleApplied && (
                          <span className="ml-2 text-[10px] text-[#A87C1F] font-bold bg-[#A87C1F]/10 px-1 py-0.5 rounded">
                            B2B Wholesale Rate
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center border border-[#CBCFB9] rounded bg-[#EEF0E7]">
                          <button
                            onClick={() => updateCartQty(product.id, quantity - 1)}
                            className="p-1 hover:bg-[#E4E8D9] text-[#0F1913]"
                            aria-label="Decrease quantity"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-7 text-center text-xs font-bold text-[#0F1913]">
                            {quantity}
                          </span>
                          <button
                            onClick={() => updateCartQty(product.id, quantity + 1)}
                            className="p-1 hover:bg-[#E4E8D9] text-[#0F1913]"
                            aria-label="Increase quantity"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>

                        <span className="font-bold text-sm text-[#0F1913]">
                          {formatPrice(itemTotal)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          {cart.length > 0 && (
            <div className="p-5 border-t border-[#CBCFB9] bg-[#EEF0E7] space-y-3">
              <div className="text-xs text-[#565F52] space-y-1">
                <div className="flex justify-between">
                  <span>{language === 'bn' ? 'ট্যাক্সেবল মূল্য (অনুমান):' : 'Taxable Subtotal (approx):'}</span>
                  <span>{formatPrice(estimatedTaxable)}</span>
                </div>
                <div className="flex justify-between">
                  <span>{language === 'bn' ? 'জিএসটি (১৮% অন্তর্বর্তী বিলিং):' : 'Estimated GST (18% included):'}</span>
                  <span>{formatPrice(estimatedGst)}</span>
                </div>
                <div className="flex justify-between">
                  <span>{language === 'bn' ? 'ডেলিভারি চার্জ:' : 'Shipping:'}</span>
                  <span className="text-[#3C6656] font-semibold">{language === 'bn' ? 'ফ্রি ডেলিভারি' : 'Free Shipping'}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-[#CBCFB9] flex justify-between items-baseline">
                <span className="font-heading font-bold text-[#0F1913] text-sm sm:text-base">
                  {language === 'bn' ? 'সর্বমোট প্রদেয়:' : 'Total Payable:'}
                </span>
                <span className="font-black text-xl text-[#0F1913]">
                  {formatPrice(cartSubtotal)}
                </span>
              </div>

              <button
                onClick={() => {
                  onClose();
                  onProceedCheckout();
                }}
                className="w-full bg-[#0F1913] hover:bg-[#182620] text-white py-3.5 px-4 rounded font-semibold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-sm"
              >
                <span>{t('checkout')}</span>
                <ArrowRight className="w-4 h-4 text-[#CC9A2E]" />
              </button>

              <div className="flex items-center justify-center gap-2 text-[11px] text-[#565F52]">
                <ShieldCheck className="w-3.5 h-3.5 text-[#3C6656]" />
                <span>{language === 'bn' ? 'সুরক্ষিত PayU গেটওয়ে ও পাক্কা জিএসটি ইনভয়েস' : 'Secured via PayU & Official Tax Invoice'}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
