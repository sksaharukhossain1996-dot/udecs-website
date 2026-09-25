import React from 'react';

interface ProductIconProps {
  name: string;
  className?: string;
}

export const ProductIcon: React.FC<ProductIconProps> = ({ name, className = 'w-12 h-12' }) => {
  switch (name) {
    case 'i-pot':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 10h16v3a7 7 0 0 1-7 7h-2a7 7 0 0 1-7-7v-3z" />
          <path d="M2 10h20" />
          <path d="M6 10V7a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v3" />
          <path d="M4 10l-2-3" />
          <path d="M20 10l2-3" />
        </svg>
      );
    case 'i-blender':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M7 3h10l-1.5 9h-7L7 3z" />
          <path d="M8.5 12h7l0.8 6a2 2 0 0 1-2 2.3H9.7a2 2 0 0 1-2-2.3l0.8-6z" />
          <path d="M9 3v-1h6v1" />
        </svg>
      );
    case 'i-box':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 8l9-5 9 5-9 5-9-5z" />
          <path d="M3 8v8l9 5 9-5V8" />
          <path d="M12 13v8" />
        </svg>
      );
    case 'i-casserole':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <ellipse cx="12" cy="9" rx="8" ry="3" />
          <path d="M4 9v5c0 1.7 3.6 3 8 3s8-1.3 8-3V9" />
          <path d="M2 9.5h1.5M20.5 9.5H22" />
        </svg>
      );
    case 'i-dumbbell':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="9" width="3" height="6" rx="0.5" />
          <rect x="19" y="9" width="3" height="6" rx="0.5" />
          <path d="M5 12h1M18 12h1" />
          <rect x="6" y="10.5" width="12" height="3" rx="0.5" />
        </svg>
      );
    case 'i-racket':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <ellipse cx="11" cy="8" rx="6" ry="7" />
          <path d="M11 15v7" />
          <path d="M8.5 4.5l5 7M15.5 4.5l-5 7" />
        </svg>
      );
    case 'i-mat':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="14" height="16" rx="2" />
          <circle cx="19" cy="12" r="2.4" />
        </svg>
      );
    case 'i-ball':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 3v18M3 12h18M5.5 5.5l13 13M18.5 5.5l-13 13" />
        </svg>
      );
    case 'i-crate':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="7" width="18" height="12" rx="1" />
          <path d="M3 12h18M9 7v12M15 7v12" />
        </svg>
      );
    case 'i-truck':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <rect x="1" y="7" width="13" height="9" rx="1" />
          <path d="M14 10h4l4 3v3h-8z" />
          <circle cx="6" cy="18" r="1.8" />
          <circle cx="17.5" cy="18" r="1.8" />
        </svg>
      );
    case 'i-shield':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3l7 3v6c0 4.5-3 8-7 9-4-1-7-4.5-7-9V6l7-3z" />
          <path d="M9 12l2 2 4-4.5" />
        </svg>
      );
    case 'i-tag':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2h7a1 1 0 0 1 1 1v7a1.5 1.5 0 0 1-.44 1.06l-9.5 9.5a1.5 1.5 0 0 1-2.12 0l-6.5-6.5a1.5 1.5 0 0 1 0-2.12l9.5-9.5A1.5 1.5 0 0 1 12 2z" />
          <circle cx="16.5" cy="7.5" r="1.4" />
        </svg>
      );
    default:
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 8v4l3 3" />
        </svg>
      );
  }
};
