/**
 * Bild-Optimierungs-Utilities
 */

/**
 * Generiert responsive srcset für Bilder
 */
export function generateSrcSet(
  baseUrl: string,
  widths: number[] = [320, 640, 960, 1280, 1920]
): string {
  return widths.map((width) => `${baseUrl}?w=${width} ${width}w`).join(', ');
}

/**
 * Generiert sizes-Attribut für responsive Bilder
 */
export function generateSizes(breakpoints: {
  mobile?: string;
  tablet?: string;
  desktop?: string;
  default: string;
}): string {
  const sizes: string[] = [];

  if (breakpoints.mobile) {
    sizes.push(`(max-width: 640px) ${breakpoints.mobile}`);
  }
  if (breakpoints.tablet) {
    sizes.push(`(max-width: 1024px) ${breakpoints.tablet}`);
  }
  if (breakpoints.desktop) {
    sizes.push(`(max-width: 1280px) ${breakpoints.desktop}`);
  }
  sizes.push(breakpoints.default);

  return sizes.join(', ');
}

/**
 * Prüft ob ein Bild geladen werden sollte (Intersection Observer)
 */
export function shouldLoadImage(element: HTMLElement | null): boolean {
  if (!element || typeof window === 'undefined' || !('IntersectionObserver' in window)) {
    return true; // Fallback: Lade sofort wenn kein IntersectionObserver
  }

  const rect = element.getBoundingClientRect();
  const isInViewport =
    rect.top < window.innerHeight + 200 && // 200px Vorlade-Bereich
    rect.bottom > -200 &&
    rect.left < window.innerWidth + 200 &&
    rect.right > -200;

  return isInViewport;
}

/**
 * Lädt ein Bild mit Preloading
 */
export function preloadImage(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = src;
  });
}

/**
 * Generiert einen optimierten Bild-URL mit Parametern
 */
export function getOptimizedImageUrl(
  baseUrl: string,
  options: {
    width?: number;
    height?: number;
    quality?: number;
    format?: 'webp' | 'avif' | 'jpg' | 'png';
  } = {}
): string {
  const params = new URLSearchParams();

  if (options.width) params.set('w', options.width.toString());
  if (options.height) params.set('h', options.height.toString());
  if (options.quality) params.set('q', options.quality.toString());
  if (options.format) params.set('f', options.format);

  const separator = baseUrl.includes('?') ? '&' : '?';
  return `${baseUrl}${separator}${params.toString()}`;
}

/**
 * Berechnet optimale Bildgröße basierend auf Container-Größe
 */
export function calculateOptimalImageSize(
  containerWidth: number,
  devicePixelRatio: number = 1,
  maxWidth?: number
): number {
  const optimalWidth = Math.ceil(containerWidth * devicePixelRatio);
  return maxWidth ? Math.min(optimalWidth, maxWidth) : optimalWidth;
}

/**
 * Prüft ob WebP unterstützt wird
 */
export function supportsWebP(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve(false);
      return;
    }

    const webP = new Image();
    webP.onload = webP.onerror = () => {
      resolve(webP.height === 2);
    };
    webP.src =
      'data:image/webp;base64,UklGRjoAAABXRUJQVlA4IC4AAACyAgCdASoCAAIALmk0mk0iIiIiIgBoSygABc6WWgAA/veff/0PP8bA//LwYAAA';
  });
}

/**
 * Prüft ob AVIF unterstützt wird
 */
export function supportsAVIF(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve(false);
      return;
    }

    const avif = new Image();
    avif.onload = avif.onerror = () => {
      resolve(avif.height === 2);
    };
    avif.src =
      'data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAADybWV0YQAAAAAAAAAoaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAGxpYmF2aWYAAAAADnBpdG0AAAAAAAEAAAAeaWxvYwAAAABEAAABAAEAAAABAAABGgAAAB0AAAAoaWluZgAAAAAAAQAAABppbmZlAgAAAAABAABhdjAxQ29sb3IAAAAAamlwcnAAAABLaXBjbwAAABRpc3BlAAAAAAAAAAIAAAACAAAAEHBpeGkAAAAAAwgICAAAAAxhdjFDgQ0MAAAAABNjb2xybmNseAACAAIAAYAAAAAXaXBtYQAAAAAAAAABAAEEAQKDBAAAACVtZGF0EgAKCBgABogQEAwgMg8f8D///8WfhwB8+ErK42A=';
  });
}

/**
 * Gibt das beste unterstützte Bildformat zurück
 */
export async function getBestImageFormat(): Promise<'avif' | 'webp' | 'jpg'> {
  if (await supportsAVIF()) return 'avif';
  if (await supportsWebP()) return 'webp';
  return 'jpg';
}
