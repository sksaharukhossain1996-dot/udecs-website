import React from 'react';
import { useStore } from '../../context/StoreContext';
import { ArrowRight, Box, Truck, Award, Sparkles, Mic } from 'lucide-react';

interface HeroProps {
  onOpenTracking: () => void;
  onOpenVoice?: () => void;
}

export const Hero: React.FC<HeroProps> = ({ onOpenTracking, onOpenVoice }) => {
  const { t, language, siteContent } = useStore();

  return (
    <section className="relative overflow-hidden pt-8 sm:pt-14 pb-12 sm:pb-16 border-b border-[#CBCFB9]/70">
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 gap-10 items-center">
          {/* Text Content */}
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-[#E4E8D9] border border-[#CBCFB9] text-xs font-semibold text-[#3C6656] mb-4">
              <Award className="w-3.5 h-3.5 text-[#A87C1F]" />
              <span>{siteContent?.heroBadge || t('heroKicker')}</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-[48px] font-black text-[#0F1913] leading-[1.15] mb-5 tracking-tight font-heading">
              {siteContent?.heroHeadline || t('heroTitle1')}
              <br />
              <span className="text-[#3C6656]">{siteContent?.heroHeadlineHighlight || t('heroTitle2')}</span>
            </h1>

            <p className="text-base sm:text-lg text-[#565F52] max-w-2xl leading-relaxed mb-8">
              {siteContent?.heroSubheadline || t('heroDesc')}
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap items-center gap-3.5 mb-10">
              <a
                href="#products"
                className="inline-flex items-center gap-2 bg-[#0F1913] hover:bg-[#182620] text-white px-6 py-3.5 rounded text-sm font-semibold transition-all shadow-sm hover:translate-y-[-1px] active:scale-[0.98]"
              >
                <span>{siteContent?.heroCtaButton || t('viewCollection')}</span>
                <ArrowRight className="w-4 h-4 text-[#CC9A2E]" />
              </a>

              {onOpenVoice && (
                <button
                  onClick={onOpenVoice}
                  className="inline-flex items-center gap-2 bg-[#E8730A] hover:bg-[#D06505] text-white px-5 py-3.5 rounded text-sm font-semibold transition-all shadow-sm active:scale-[0.98]"
                  title="Talk directly with the Gemini Live voice assistant"
                >
                  <Mic className="w-4 h-4 text-amber-200 animate-pulse" />
                  <span>Talk with Voice AI</span>
                </button>
              )}

              <a
                href="#wholesale"
                className="inline-flex items-center gap-2 bg-[#FBFAF5] hover:bg-[#E4E8D9] text-[#0F1913] border border-[#9CA48A] hover:border-[#A87C1F] px-6 py-3.5 rounded text-sm font-semibold transition-all active:scale-[0.98]"
              >
                <Box className="w-4 h-4 text-[#3C6656]" />
                <span>{siteContent?.heroSecondaryButton || t('orderWholesale')}</span>
              </a>

              <button
                onClick={onOpenTracking}
                className="inline-flex items-center gap-2 text-xs font-semibold text-[#565F52] hover:text-[#0F1913] px-3 py-3 underline decoration-[#A87C1F] decoration-2 underline-offset-4"
              >
                <Truck className="w-3.5 h-3.5 text-[#A87C1F]" />
                <span>{t('quickTrack')}</span>
              </button>
            </div>


          </div>

        </div>
      </div>
    </section>
  );
};
