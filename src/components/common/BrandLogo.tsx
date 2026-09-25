import React from 'react';

interface BrandLogoProps {
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  textColor?: string;
  subtextColor?: string;
  onClick?: () => void;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  className = '',
  size = 'md',
  showText = true,
  textColor,
  subtextColor,
  onClick,
}) => {
  // Dimension presets
  const sizeMap = {
    xs: { icon: 28, text: 'text-sm', sub: 'text-[7px]' },
    sm: { icon: 36, text: 'text-lg', sub: 'text-[8.5px]' },
    md: { icon: 46, text: 'text-2xl', sub: 'text-[9.5px]' },
    lg: { icon: 58, text: 'text-3xl', sub: 'text-[11px]' },
    xl: { icon: 84, text: 'text-5xl', sub: 'text-[14px]' },
  };

  const current = sizeMap[size];

  return (
    <div
      onClick={onClick}
      className={`inline-flex items-center gap-2.5 select-none ${onClick ? 'cursor-pointer' : ''} ${className}`}
    >
      {/* High-fidelity transparent vector logo emblem */}
      <div
        className="relative shrink-0 flex items-center justify-center transition-transform hover:scale-105 duration-200"
        style={{ width: current.icon, height: current.icon }}
      >
        <img
          src="/UDECS_Logo_Premium_Transparent.png"
          alt="UDECS COMMERCE SOLUTIONS Logo"
          className="w-full h-full object-contain filter drop-shadow-xs"
          loading="eager"
        />
      </div>

      {/* Brand Wordmark & Tagline (if showText is true) */}
      {showText && (
        <div className="flex flex-col leading-none">
          <div className="flex items-center tracking-tight">
            <span
              className={`font-heading font-black ${current.text} tracking-wider ${
                textColor || 'text-[#1B365D]'
              }`}
              style={{ letterSpacing: '0.04em' }}
            >
              UDECS
            </span>
          </div>
          <span
            className={`font-sans font-bold uppercase tracking-[0.18em] ${current.sub} mt-0.5 ${
              subtextColor || 'text-[#1B365D]/80'
            }`}
          >
            Commerce Solutions
          </span>
        </div>
      )}
    </div>
  );
};
