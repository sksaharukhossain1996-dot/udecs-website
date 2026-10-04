import React, { useState, useRef } from 'react';
import { customerProductText } from '../../lib/wholesale';
import { saveRfq } from '../../firebase/rfqService';
import { useStore } from '../../context/StoreContext';
import { Box, ShieldCheck, Truck, Percent, Phone, Mail, CheckCircle2 } from 'lucide-react';

export const WholesaleSection: React.FC = () => {
  const { company, siteContent, language, catalogIndex, catalogError } = useStore();
  const [formData, setFormData] = useState({
    businessName: '',
    contactPerson: '',
    phone: '',
    email: '',
    productCategory: 'kitchen',
    estimatedQuantity: '100',
    notes: '',
  });
  const [productSearch, setProductSearch] = useState('');
  const [choiceCount, setChoiceCount] = useState(24);
  const [selectedProducts, setSelectedProducts] = useState<{id: string; sku: string; name: string}[]>([]);
  const b2bChoices = catalogIndex.filter(p => p.supplier === 'rajkot' && `${p.name} ${p.sku}`.toLowerCase().includes(productSearch.toLowerCase()));
  const requestRef = useRef<{id: string; createdAt: string} | null>(null);
  const [submitError, setSubmitError] = useState('');
  const [savedReference, setSavedReference] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.businessName.trim() || !formData.contactPerson.trim() || !formData.phone.trim()) {
      alert('Please provide your business name, contact person and phone number.');
      return;
    }

    if (isSubmitting) return;
    setSubmitError('');
    setIsSubmitting(true);
    if (!requestRef.current) requestRef.current = { id: `INQ-${crypto.randomUUID()}`, createdAt: new Date().toISOString() };
    try {
      const reference = await saveRfq(requestRef.current.id, {
        businessName: formData.businessName,
        contactPerson: formData.contactPerson,
        phone: formData.phone,
        email: formData.email,
        category: formData.productCategory,
        estVolume: formData.estimatedQuantity,
        notes: formData.notes,
        selectedProducts,
      }, requestRef.current.createdAt);

      setSavedReference(reference);
      setIsSubmitted(true);
    } catch (err) {
      setSubmitError(language === 'bn' ? 'রিকোয়েস্ট সেভ নিশ্চিত করা যায়নি। আপনার তথ্য রাখা আছে। আবার চেষ্টা করুন।' : 'We could not confirm your request was saved. Your details are still here. Retry safely using the same request reference.');
      setIsSubmitted(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="py-14 sm:py-20 bg-[#182620] text-white border-b border-[#CBCFB9]/40" id="wholesale">
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          {/* Left Column: B2B Program Benefits */}
          <div className="lg:col-span-6 space-y-6">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-white/10 text-[#CC9A2E] text-xs font-semibold uppercase tracking-wider font-mono">
              <Box className="w-3.5 h-3.5" />
              <span>B2B Direct Wholesale & Sourcing</span>
            </div>

            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black font-heading tracking-tight leading-tight">
              {siteContent?.wholesaleHeadline ? (
                <span>{siteContent.wholesaleHeadline}</span>
              ) : language === 'bn' ? (
                <>
                  ব্যবসায়ী ও রিটেইলারদের জন্য <br />
                  <span className="text-[#CC9A2E]">সরাসরি ফ্যাক্টরি রেটে পাইকারি সাপ্লাই</span>
                </>
              ) : (
                <>
                  Direct Manufacturer Pallets & <br />
                  <span className="text-[#CC9A2E]">Bulk Merchant Supply Chain</span>
                </>
              )}
            </h2>

            <p className="text-[#B9BFAE] text-sm sm:text-base leading-relaxed">
              {siteContent?.wholesaleSubheadline ||
                (language === 'bn'
                  ? `আপনার দোকান, সুপারশপ বা অনলাইন স্টোরের জন্য পাইকারি মূল্যে পণ্য কিনুন। প্রতিটি অর্ডারে বিস্তারিত বিল এবং ব্যবসায়িক সহায়তা পাবেন।`
                  : 'Stock your retail shop, regional distribution hub, or online store directly at bulk factory tiers. Complete with 100% compliant GST Tax Invoices and door-to-door surface freight.')}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="p-3.5 rounded bg-white/5 border border-white/10 flex items-start gap-3">
                <Percent className="w-5 h-5 text-[#CC9A2E] shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-xs text-white">Up to 40% Volume Discounts</h4>
                  <p className="text-[11px] text-[#B9BFAE] mt-0.5">
                    Tiered pricing for cartons (10+ units) and wooden pallets (50+ units).
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded bg-white/5 border border-white/10 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-[#CC9A2E] shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-xs text-white">100% GST Tax Credit</h4>
                  <p className="text-[11px] text-[#B9BFAE] mt-0.5">
                    Valid HSN codes for seamless monthly GSTR-1 and GSTR-3B filings.
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded bg-white/5 border border-white/10 flex items-start gap-3">
                <Truck className="w-5 h-5 text-[#CC9A2E] shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-xs text-white">Pallet Freight Across India</h4>
                  <p className="text-[11px] text-[#B9BFAE] mt-0.5">
                    Express dispatch via Delhivery & Blue Dart surface fleet across 64 districts.
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded bg-white/5 border border-white/10 flex items-start gap-3">
                <Phone className="w-5 h-5 text-[#CC9A2E] shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-xs text-white">Dedicated Wholesale RM</h4>
                  <p className="text-[11px] text-[#B9BFAE] mt-0.5">
                    Direct account manager support on WhatsApp: +91 9845485437.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Inquiry Form */}
          <div className="lg:col-span-6 bg-[#FBFAF5] text-[#0F1913] p-6 sm:p-8 rounded-lg border border-[#CBCFB9] shadow-xl">
            {isSubmitted ? (
              <div className="text-center py-8 space-y-3">
                <CheckCircle2 className="w-12 h-12 text-[#3C6656] mx-auto" />
                <h3 className="text-xl font-bold font-heading text-[#0F1913]">
                  {language === 'bn' ? 'পাইকারি কোটেশন রিকোয়েস্ট সফল!' : 'Wholesale RFQ Submitted!'}
                </h3>
                <p className="text-xs text-[#565F52] max-w-md mx-auto">
                  {language === 'bn'
                    ? 'আপনার রিকোয়েস্ট পাইকারি টিমের জন্য সেভ হয়েছে। চাইলে হোয়াটসঅ্যাপেও যোগাযোগ করতে পারেন।'
                    : 'Your request has been saved for the wholesale team. You can also contact us on WhatsApp.'}
                </p>
                <p className="text-[11px] font-mono break-all">Reference: {savedReference}</p>
                <div className="pt-2">
                  <a
                    href={`https://wa.me/${company.whatsapp.replace(/[^0-9]/g, '')}?text=Hi,%20I%20just%20submitted%20a%20B2B%20wholesale%20request%20for%20${encodeURIComponent(formData.businessName)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 bg-[#25D366] text-white px-5 py-2.5 rounded font-semibold text-xs shadow-sm hover:bg-[#1EBE5D]"
                  >
                    <Phone className="w-4 h-4" />
                    <span>WhatsApp Quote: {company.whatsapp}</span>
                  </a>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-3.5">
                {submitError && <div role="alert" className="rounded border border-red-300 bg-red-50 p-3 text-xs text-red-800"><p>{submitError}</p><p className="mt-2 font-mono break-all">Reference: {requestRef.current?.id}</p></div>}
                <div className="border-b border-[#CBCFB9] pb-2 mb-2">
                  <h3 className="text-lg font-bold font-heading text-[#0F1913]">
                    {language === 'bn' ? 'B2B পাইকারি কোটেশন রিকোয়েস্ট' : 'Request Wholesale Pallet Quotation'}
                  </h3>
                  <p className="text-[11px] text-[#565F52]">
                    Get instant catalog prices, sample shipment and credit terms.
                  </p>
                </div>

                <fieldset className="rfq-products rounded-lg border border-[#CBCFB9] p-3">
                  <style>{`.visual-store #wholesale .rfq-products { color: #fff; } .visual-store #wholesale .rfq-products label, .visual-store #wholesale .rfq-products label > span { color: #233f66 !important; } .visual-store #wholesale .rfq-products button, .visual-store #wholesale .rfq-products legend { color: #fff !important; }`}</style>
                  <legend className="px-1 text-xs font-bold">Choose B2B products (optional)</legend>
                  <p className="mb-2 text-[11px]">Select one or more products for your inquiry. This is not an order or payment.</p>
                  <input aria-label="Search B2B products" type="search" value={productSearch} onChange={e => {setProductSearch(e.target.value);setChoiceCount(24);}} placeholder="Search product or SKU" className="mb-2 w-full rounded border p-2 text-xs" />
                  {catalogError && <p role="alert" className="text-xs text-red-700">Product choices are unavailable. You can still describe your requirements below.</p>}
                  <div className="max-h-60 space-y-2 overflow-y-auto">
                    {b2bChoices.slice(0,choiceCount).map(product => <label key={product.id} className="flex items-start gap-2 rounded border border-slate-200 bg-white p-2 text-xs text-slate-800">
                      <input type="checkbox" checked={selectedProducts.some(p => p.id === product.id)} onChange={e => setSelectedProducts(old => e.target.checked ? [...old,{id:product.id,sku:product.sku,name:customerProductText(product,product.name)}] : old.filter(p => p.id !== product.id))} />
                      <span>{customerProductText(product,product.name)}<span className="block text-[10px] text-slate-500">{product.sku}</span></span>
                    </label>)}
                  </div>
                  {choiceCount < b2bChoices.length && <button type="button" onClick={() => setChoiceCount(n => n+24)} className="mt-2 text-xs font-semibold underline">Show more choices</button>}
                  <p className="mt-2 text-[11px]">{selectedProducts.length} selected · {b2bChoices.length} matching B2B products</p>
                  {selectedProducts.length > 0 && <ul className="mt-2 space-y-1 text-[11px]">{selectedProducts.map(p => <li key={p.id}>{p.name} <button type="button" className="ml-1 underline" onClick={() => setSelectedProducts(old => old.filter(x => x.id !== p.id))}>Remove</button></li>)}</ul>}
                </fieldset>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-[#182620] mb-1">
                      Business / Shop Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Bengal Traders / Apex Retail"
                      value={formData.businessName}
                      onChange={(e) =>
                        setFormData({ ...formData, businessName: e.target.value })
                      }
                      className="w-full text-xs bg-white border border-[#CBCFB9] rounded p-2 text-[#0F1913] focus:border-[#A87C1F] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-[#182620] mb-1">
                      Contact Person Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Rajesh Ghosh"
                      value={formData.contactPerson}
                      onChange={(e) =>
                        setFormData({ ...formData, contactPerson: e.target.value })
                      }
                      className="w-full text-xs bg-white border border-[#CBCFB9] rounded p-2 text-[#0F1913] focus:border-[#A87C1F] focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-[#182620] mb-1">
                      WhatsApp / Mobile *
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="+91 9831000000"
                      value={formData.phone}
                      onChange={(e) =>
                        setFormData({ ...formData, phone: e.target.value })
                      }
                      className="w-full text-xs bg-white border border-[#CBCFB9] rounded p-2 text-[#0F1913] focus:border-[#A87C1F] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-[#182620] mb-1">
                      Email Address
                    </label>
                    <input
                      type="email"
                      placeholder="trader@company.com"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      className="w-full text-xs bg-white border border-[#CBCFB9] rounded p-2 text-[#0F1913] focus:border-[#A87C1F] focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-[#182620] mb-1">
                      Interested Product Line
                    </label>
                    <select
                      value={formData.productCategory}
                      onChange={(e) =>
                        setFormData({ ...formData, productCategory: e.target.value })
                      }
                      className="w-full text-xs bg-white border border-[#CBCFB9] rounded p-2 text-[#0F1913]"
                    >
                      <option value="kitchen">Kitchen & Cookware Sets</option>
                      <option value="sports">Sports, Dumbbells & Fitness</option>
                      <option value="wholesale">Full Container / Pallet Lots</option>
                      <option value="industrial">Industrial Hardware & Tools</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-[#182620] mb-1">
                      Estimated Order Volume
                    </label>
                    <select
                      value={formData.estimatedQuantity}
                      onChange={(e) =>
                        setFormData({ ...formData, estimatedQuantity: e.target.value })
                      }
                      className="w-full text-xs bg-white border border-[#CBCFB9] rounded p-2 text-[#0F1913]"
                    >
                      <option value="50">50 - 100 Units (Starter Merchant)</option>
                      <option value="250">100 - 500 Units (Carton Pallet)</option>
                      <option value="1000">500 - 2,000 Units (Regional Hub)</option>
                      <option value="5000">2,000+ Units (Container FCL)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#182620] mb-1">
                    Special Packaging or Custom Branding Notes
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Provide details about custom labels, barcode requirements, or delivery city..."
                    value={formData.notes}
                    onChange={(e) =>
                      setFormData({ ...formData, notes: e.target.value })
                    }
                    className="w-full text-xs bg-white border border-[#CBCFB9] rounded p-2 text-[#0F1913] focus:border-[#A87C1F] focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-[#0F1913] hover:bg-[#182620] disabled:opacity-50 text-white py-3 rounded text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-sm"
                >
                  <Mail className="w-4 h-4 text-[#CC9A2E]" />
                  <span>{isSubmitting ? 'Submitting to Cloud...' : 'Submit Wholesale Quotation Request'}</span>
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
