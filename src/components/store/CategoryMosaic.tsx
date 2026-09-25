import React from 'react';
import { useStore } from '../../context/StoreContext';
import { ProductIcon } from '../common/ProductIcon';
import { ArrowRight } from 'lucide-react';

interface CategoryMosaicProps {
  onSelectCategory: (cat: 'all' | 'kitchen' | 'sports' | 'wholesale' | 'industrial') => void;
}

export const CategoryMosaic: React.FC<CategoryMosaicProps> = ({ onSelectCategory }) => {
  const { language } = useStore();

  return (
    <section className="py-14 sm:py-20 border-b border-[#CBCFB9]/70" id="categories">
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-10 gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-[#0F1913] tracking-tight font-heading">
              {language === 'bn' ? 'ক্যাটাগরি অনুযায়ী সাজানো সম্ভার' : 'Curated Category Collections'}
            </h2>
            <p className="text-[#565F52] text-sm sm:text-base mt-2 max-w-xl">
              {language === 'bn'
                ? 'সরাসরি যাচাইকৃত সরবরাহকারীদের থেকে সংগৃহীত — খুচরা ক্রেতা ও পাইকারি ব্যবসায়ী, দুজনের জন্যই।'
                : 'Directly sourced from vetted manufacturers — designed for individual buyers and commercial wholesale retailers alike.'}
            </p>
          </div>
          <button
            onClick={() => onSelectCategory('all')}
            className="text-xs font-semibold text-[#A87C1F] hover:text-[#0F1913] flex items-center gap-1.5 self-start sm:self-auto"
          >
            <span>{language === 'bn' ? 'সব পণ্য একসাথে দেখুন' : 'Explore All Collections'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Mosaic Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
          {/* Card 1: Kitchen (Large spanning card) */}
          <div
            onClick={() => onSelectCategory('kitchen')}
            className="md:col-span-6 bg-[#FBFAF5] border border-[#CBCFB9] hover:border-[#A87C1F] p-7 sm:p-8 rounded transition-all duration-200 cursor-pointer corner-brackets group flex flex-col justify-between min-h-[300px]"
          >
            <div>
              <div className="text-[11px] font-mono-code font-bold tracking-wider text-[#A87C1F] mb-3">
                CAT-01 · KITCHEN & HOME
              </div>
              <div className="text-[#3C6656] mb-4 group-hover:scale-105 transition-transform">
                <ProductIcon name="i-pot" className="w-11 h-11 text-[#3C6656]" />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-[#0F1913] mb-2 font-heading">
                {language === 'bn' ? 'রান্নাঘর ও গৃহস্থালী পণ্য' : 'Kitchenware & Home Appliances'}
              </h3>
              <p className="text-[#565F52] text-sm leading-relaxed max-w-md">
                {language === 'bn'
                  ? 'নন-স্টিক ফ্রাইপ্যান, ২ লিটার কপার ব্লেন্ডার, এয়ারটাইট ফুড বক্স ও থার্মাল হটপট ক্যাসারোল — প্রতিদিনের ঘর গোছানোর সব দরকারি জিনিস।'
                  : 'Multi-layer non-stick cookware, 750W heavy-duty blenders, food-grade storage sets, and vacuum hotpot casseroles.'}
              </p>
            </div>
            <div className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-[#0F1913] group-hover:text-[#A87C1F] transition-colors">
              <span>{language === 'bn' ? 'কালেকশন দেখুন' : 'View Collection'}</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </div>
          </div>

          {/* Right Column containing Sports and Wholesale */}
          <div className="md:col-span-6 flex flex-col gap-5">
            {/* Card 2: Sports */}
            <div
              onClick={() => onSelectCategory('sports')}
              className="bg-[#FBFAF5] border border-[#CBCFB9] hover:border-[#A87C1F] p-6 sm:p-7 rounded transition-all duration-200 cursor-pointer corner-brackets group flex flex-col justify-between flex-1"
            >
              <div>
                <div className="text-[11px] font-mono-code font-bold tracking-wider text-[#A87C1F] mb-2">
                  CAT-02 · SPORTS & FITNESS
                </div>
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg sm:text-xl font-bold text-[#0F1913] mb-1.5 font-heading">
                      {language === 'bn' ? 'স্পোর্টস ও ফিটনেস সামগ্রী' : 'Sports & Physical Fitness'}
                    </h3>
                    <p className="text-[#565F52] text-xs sm:text-sm max-w-sm">
                      {language === 'bn'
                        ? '২০ কেজি রাবার ডাম্বেল, ৮ মিমি যোগা ম্যাট, কার্বন ব্যাডমিন্টন র‍্যাকেট ও ফিফা স্ট্যান্ডার্ড ফুটবল।'
                        : 'Adjustable cast iron dumbbells, high-density yoga mats, pro carbon rackets, and tournament footballs.'}
                    </p>
                  </div>
                  <div className="text-[#3C6656] group-hover:scale-105 transition-transform shrink-0 ml-3">
                    <ProductIcon name="i-dumbbell" className="w-9 h-9 text-[#3C6656]" />
                  </div>
                </div>
              </div>
              <div className="mt-4 inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[#0F1913] group-hover:text-[#A87C1F] transition-colors">
                <span>{language === 'bn' ? 'কালেকশন দেখুন' : 'View Collection'}</span>
                <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
              </div>
            </div>

            {/* Card 3: Wholesale */}
            <div
              onClick={() => onSelectCategory('wholesale')}
              className="bg-[#182620] text-white border border-[#182620] hover:border-[#CC9A2E] p-6 sm:p-7 rounded transition-all duration-200 cursor-pointer corner-brackets group flex flex-col justify-between flex-1"
            >
              <div>
                <div className="text-[11px] font-mono-code font-bold tracking-wider text-[#CC9A2E] mb-2">
                  CAT-03 · B2B WHOLESALE & BULK SUPPLY
                </div>
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg sm:text-xl font-bold text-white mb-1.5 font-heading">
                      {language === 'bn' ? 'পাইকারি ও ট্রেডিং সাপ্লাই' : 'Wholesale Pallets & Trading Lots'}
                    </h3>
                    <p className="text-[#B9BFAE] text-xs sm:text-sm max-w-sm">
                      {language === 'bn'
                        ? 'দোকান বা ব্যবসার জন্য ১০০+ পিসের বাল্ক বান্ডিল, কাস্টম প্যাকেজিং সার্ভিস ও কন্টেইনার লট সরাসরি ফ্যাক্টরি রেটে।'
                        : 'Bulk merchant starter packs, custom branded cartons, and FCL container loads with GST compliance.'}
                    </p>
                  </div>
                  <div className="text-[#CC9A2E] group-hover:scale-105 transition-transform shrink-0 ml-3">
                    <ProductIcon name="i-crate" className="w-9 h-9 text-[#CC9A2E]" />
                  </div>
                </div>
              </div>
              <div className="mt-4 inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[#CC9A2E] transition-colors">
                <span>{language === 'bn' ? 'পাইকারি অফার দেখুন' : 'View Wholesale Deals'}</span>
                <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
