import { useState, useEffect, useMemo } from 'react';

export type ViewportSize = 'mobile' | 'tablet' | 'desktop' | 'large';

interface ViewportInfo {
  width: number;
  height: number;
  size: ViewportSize;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isLarge: boolean;
}

interface AdaptiveSizes {
  cardWidth: number;
  cardHeight: number;
  handGap: number;
  fieldGap: number;
  sidebarWidth: number;
  fontSize: 'xs' | 'sm' | 'base' | 'lg';
}

export function useResponsiveLayout(): ViewportInfo & { adaptiveSizes: AdaptiveSizes } {
  const [viewport, setViewport] = useState<ViewportInfo>(() => {
    if (typeof window === 'undefined') {
      return {
        width: 1024,
        height: 768,
        size: 'desktop',
        isMobile: false,
        isTablet: false,
        isDesktop: true,
        isLarge: false,
      };
    }

    const width = window.innerWidth;
    const height = window.innerHeight;

    let size: ViewportSize;
    if (width < 640) size = 'mobile';
    else if (width < 1024) size = 'tablet';
    else if (width < 1440) size = 'desktop';
    else size = 'large';

    return {
      width,
      height,
      size,
      isMobile: size === 'mobile',
      isTablet: size === 'tablet',
      isDesktop: size === 'desktop',
      isLarge: size === 'large',
    };
  });

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;

      let size: ViewportSize;
      if (width < 640) size = 'mobile';
      else if (width < 1024) size = 'tablet';
      else if (width < 1440) size = 'desktop';
      else size = 'large';

      setViewport({
        width,
        height,
        size,
        isMobile: size === 'mobile',
        isTablet: size === 'tablet',
        isDesktop: size === 'desktop',
        isLarge: size === 'large',
      });
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Initial call

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const adaptiveSizes = useMemo((): AdaptiveSizes => {
    switch (viewport.size) {
      case 'mobile':
        return {
          cardWidth: 48, // 3rem = 48px
          cardHeight: 64, // 4rem = 64px
          handGap: 4, // 0.25rem = 4px
          fieldGap: 6, // 0.375rem = 6px
          sidebarWidth: 280, // 17.5rem = 280px (collapsed)
          fontSize: 'xs',
        };
      case 'tablet':
        return {
          cardWidth: 56, // 3.5rem = 56px
          cardHeight: 80, // 5rem = 80px
          handGap: 6, // 0.375rem = 6px
          fieldGap: 8, // 0.5rem = 8px
          sidebarWidth: 320, // 20rem = 320px
          fontSize: 'sm',
        };
      case 'desktop':
        return {
          cardWidth: 64, // 4rem = 64px
          cardHeight: 96, // 6rem = 96px
          handGap: 8, // 0.5rem = 8px
          fieldGap: 12, // 0.75rem = 12px
          sidebarWidth: 400, // 25rem = 400px
          fontSize: 'base',
        };
      case 'large':
        return {
          cardWidth: 80, // 5rem = 80px
          cardHeight: 112, // 7rem = 112px
          handGap: 12, // 0.75rem = 12px
          fieldGap: 16, // 1rem = 16px
          sidebarWidth: 480, // 30rem = 480px
          fontSize: 'lg',
        };
      default:
        return {
          cardWidth: 64,
          cardHeight: 96,
          handGap: 8,
          fieldGap: 12,
          sidebarWidth: 400,
          fontSize: 'base',
        };
    }
  }, [viewport.size]);

  return {
    ...viewport,
    adaptiveSizes,
  };
}
