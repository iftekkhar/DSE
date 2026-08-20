import { useState, useEffect } from 'react';

/**
 * Custom hook for reactive responsive breakpoint detection.
 * Breakpoints aligned with modern multi-device standards:
 * - Mobile (sm): < 640px (iPhone, Android phones)
 * - Tablet (md/lg): 640px - 1024px (iPad, iPad Pro, Android tablets, Foldables)
 * - Laptop (xl): 1024px - 1440px (MacBook Air/Pro, Laptops)
 * - Desktop (2xl): >= 1440px (iMac, 4K Monitors, Ultrawides)
 */
export function useMediaQuery() {
  const [windowWidth, setWindowWidth] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth : 1200
  );

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize, { passive: true });
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobile = windowWidth < 640;
  const isTablet = windowWidth >= 640 && windowWidth < 1024;
  const isLaptop = windowWidth >= 1024 && windowWidth < 1440;
  const isDesktop = windowWidth >= 1440;

  return {
    windowWidth,
    isMobile,
    isTablet,
    isLaptop,
    isDesktop,
    isTouchDevice: typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0)
  };
}
