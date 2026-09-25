import React, { useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { Box, ShieldCheck, Truck, Percent, Phone, Mail, CheckCircle2 } from 'lucide-react';

export const WholesaleSection: React.FC = () => {
  const { company, siteContent, addAuditLog, sendNotification, submitWholesaleInquiry, language } = useStore();
  const [formData, setFormData] = useState({
    businessName: '',
    contactPerson: '',
    phone: '',
    email: '',
    productCategory: 'kitchen',
    estimatedQuantity: '100',
    notes: '',
  });
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.businessName || !formData.phone) {
      alert('Please provide your business name and contact number.');
      return;
    }

    setIsSubmitting(true);
    try {
      await submitWholesaleInquiry({
        businessName: formData.businessName,
        contactPerson: formData.contactPerson,
        phone: formData.phone,
        email: formData.email,
        category: formData.productCategory,
        estVolume: formData.estimatedQuantity,
        notes: formData.notes,
      });

      sendNotification(
        'email',
        company.emailGmail,
        `New B2B Wholesale Lead: ${formData.businessName}`,
        `Contact: ${formData.contactPerson} (${formData.phone})\nCategory: ${formData.productCategory}\nEstimated Units: ${formData.estimatedQuantity}\nNotes: ${formData.notes}`
      );

      setIsSubmitted(true);
    } catch (err) {
      console.error('Error submitting wholesale inquiry:', err);
      // Fallback submit
      setIsSubmitted(true);
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
                    ? 'আমাদের B2B একাউন্ট ম্যানেজার খুব শীঘ্রই আপনার সাথে যোগাযোগ করবেন। তাৎক্ষণিক কোটের জন্য হোয়াটসঅ্যাপ করুন:'
                    : 'Our senior commercial manager will review your inventory requirements and share formal quotation within 2 hours.'}
                </p>
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
                <div className="border-b border-[#CBCFB9] pb-2 mb-2">
                  <h3 className="text-lg font-bold font-heading text-[#0F1913]">
                    {language === 'bn' ? 'B2B পাইকারি কোটেশন রিকোয়েস্ট' : 'Request Wholesale Pallet Quotation'}
                  </h3>
                  <p className="text-[11px] text-[#565F52]">
                    Get instant catalog prices, sample shipment and credit terms.
                  </p>
                </div>

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
