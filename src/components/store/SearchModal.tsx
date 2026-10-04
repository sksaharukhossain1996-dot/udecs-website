import {matchCatalog,readProductsByIds} from '../../firebase/catalogIndex';
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
  const { products, catalogIndex, catalogError, formatPrice, language } = useStore();
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const paged=!(window as any).__UDECS_STAFF_ENTRY__;
  const [resultProducts,setResultProducts]=useState<Product[]>([]);
  const [visibleCount,setVisibleCount]=useState(24);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  useEffect(()=>setVisibleCount(24),[query,isOpen]);
  const matches=matchCatalog(catalogIndex,query,'all',true);
  const key=matches.map(e=>e.id).join('|');
  useEffect(()=>{
    if(!isOpen||!paged)return;let active=true;
    const ids=matches.slice(0,visibleCount).map(e=>e.id);
    const existing=new Map([...products,...resultProducts].map(p=>[p.id,p]));
    const missing=ids.filter(id=>!existing.has(id));setBusy(true);setError('');setResultProducts(prev=>prev.filter(p=>ids.includes(p.id)));
    const timer=setTimeout(()=>{(async()=>{for(let i=0;i<missing.length;i+=24){const batch=await readProductsByIds(missing.slice(i,i+24));batch.forEach(p=>existing.set(p.id,p));}if(active)setResultProducts(ids.flatMap(id=>existing.has(id)?[existing.get(id)!]:[]));})().catch(()=>{if(active)setError('Search products could not be loaded. Please try later.');}).finally(()=>{if(active)setBusy(false);});},300);
    return()=>{active=false;clearTimeout(timer);};
  },[key,visibleCount,isOpen,products,paged]);
  useEffect(()=>{if(!isOpen)return;const close=(e:KeyboardEvent)=>{if(e.key==='Escape')onClose()};window.addEventListener('keydown',close);return()=>window.removeEventListener('keydown',close)},[isOpen,onClose]);
  if (!isOpen) return null;
  const results = paged?resultProducts:products.filter(p=>p.supplier!=='rajkot'&&!(p as any).hidden&&!(p as any).gatewayVerification).filter(p=>
    p.name.toLowerCase().includes(query.toLowerCase())||p.nameBn.includes(query)||p.sku.toLowerCase().includes(query.toLowerCase())||p.category.toLowerCase().includes(query.toLowerCase())||p.hsn.includes(query));
  const total=paged?matches.length:results.length;

  return (
    <div onClick={e=>{if(e.target===e.currentTarget)onClose()}} className="fixed inset-0 z-50 flex items-start justify-center p-4 sm:pt-20 bg-[#0F1913]/60 backdrop-blur-xs animate-fadeIn">
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

        {(error||catalogError)&&<p role="alert" className="p-4 text-red-700">{error||catalogError}</p>}
        {busy&&<p role="status" className="p-4 text-sm">Loading products...</p>}
        {/* Results List */}
        <div className="max-h-96 overflow-y-auto p-2 divide-y divide-[#CBCFB9]/40">
          {results.length === 0 && !busy && !error && !catalogError ? (
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
                      HSN: {product.hsn} · {product.stockManaged === false ? 'Supplier availability confirmed on order' : `Stock: ${product.stock} units`}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  {product.originalPrice && product.originalPrice > product.price && (
                    <span className="text-[10px] line-through text-[#8A9184] block">
                      {formatPrice(product.originalPrice)}
                    </span>
                  )}
                  <span className="font-bold text-xs text-[#0F1913] block">
                    {formatPrice(product.price)}
                  </span>
                  {product.originalPrice && product.originalPrice > product.price && (
                    <span className="text-[9px] font-bold text-[#3C6656] block">
                      {Math.round((1 - product.price / product.originalPrice) * 100)}% OFF
                    </span>
                  )}
                  <span className="text-[10px] text-[#3C6656] font-semibold flex items-center gap-1">
                    <span>View</span>
                    <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {paged&&visibleCount<total&&<button disabled={busy||!!error} onClick={()=>setVisibleCount(c=>c+24)} className="p-3 w-full text-sm">Show more products</button>}
        {/* Footer */}
        <div className="p-2.5 bg-[#EEF0E7] border-t border-[#CBCFB9] text-[10px] text-[#565F52] flex justify-between">
          <span>{total} products found</span>
          <span>Press ESC or click outside to dismiss</span>
        </div>
      </div>
    </div>
  );
};
