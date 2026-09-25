import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../../context/StoreContext';
import { Product } from '../../types';
import { ProductIcon } from '../common/ProductIcon';
import { Search, X, ArrowRight, Star } from 'lucide-react';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectProduct: (product: Product) => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({
  isOpen,
  onClose,
  onSelectProduct,
}) => {
  const { products, formatPrice, language } = useStore();
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const results = products.filter(
    (p) =>
      p.name.toLowerCase().includes(query.toLowerCase()) ||
      p.nameBn.includes(query) ||
      p.sku.toLowerCase().includes(query.toLowerCase()) ||
      p.category.toLowerCase().includes(query.toLowerCase()) ||
      p.hsn.includes(query)
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 sm:pt-20 bg-[#0F1913]/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-[#FBFAF5] border border-[#CBCFB9] rounded-xl max-w-xl w-full shadow-2xl overflow-hidden">
        {/* Search Input Bar */}
        <div className="p-4 border-b border-[#CBCFB9] flex items-center gap-3 bg-white">
          <Search className="w-5 h-5 text-[#565F52]" />
          <input
            ref={inputRef}
            type="text"
            placeholder={
              language === 'bn'
                ? 'পণ্য, SKU, ক্যাটাগরি বা HSN দিয়ে খুঁজুন...'
                : 'Search products, SKU, category, or HSN code...'
            }
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 text-sm bg-transparent text-[#0F1913] focus:outline-none placeholder-[#565F52]/60"
          />
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-[#E4E8D9] text-[#565F52]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-96 overflow-y-auto p-2 divide-y divide-[#CBCFB9]/40">
          {results.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#565F52]">
              No products found matching &quot;{query}&quot;
            </div>
          ) : (
            results.map((product) => (
              <div
                key={product.id}
                onClick={() => {
                  onSelectProduct(product);
                  onClose();
                }}
                className="p-3 flex items-center justify-between hover:bg-[#EEF0E7] rounded cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded bg-[#E4E8D9] flex items-center justify-center text-[#3C6656] shrink-0 border border-[#CBCFB9]">
                    <ProductIcon name={product.imageIcon} className="w-6 h-6 text-[#3C6656]" />
                  </div>
                  <div>
                    <span className="font-mono text-[10px] text-[#A87C1F] font-bold">
                      {product.sku}
                    </span>
                    <h4 className="font-semibold text-xs text-[#0F1913]">
                      {language === 'bn' ? product.nameBn : product.name}
                    </h4>
                    <span className="text-[10px] text-[#565F52]">
                      HSN: {product.hsn} · Stock: {product.stock} units
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="font-bold text-xs text-[#0F1913] block">
                    {formatPrice(product.price)}
                  </span>
                  <span className="text-[10px] text-[#3C6656] font-semibold flex items-center gap-1">
                    <span>View</span>
                    <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-2.5 bg-[#EEF0E7] border-t border-[#CBCFB9] text-[10px] text-[#565F52] flex justify-between">
          <span>{results.length} products found</span>
          <span>Press ESC or click outside to dismiss</span>
        </div>
      </div>
    </div>
  );
};
