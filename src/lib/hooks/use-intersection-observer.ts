import { useEffect, useRef, useState } from 'react';

interface UseIntersectionObserverOptions {
  threshold?: number;
  root?: Element | null;
  rootMargin?: string;
  enabled?: boolean;
}

/**
 * Hook für Intersection Observer
 *
 * @param options - Optionen für den Intersection Observer
 * @returns Ref für das zu beobachtende Element und ob es sichtbar ist
 */
export function useIntersectionObserver({
  threshold = 0,
  root = null,
  rootMargin = '0px',
  enabled = true,
}: UseIntersectionObserverOptions = {}) {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const [hasIntersected, setHasIntersected] = useState(false);
  const elementRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!enabled || !elementRef.current) {
      return;
    }

    const element = elementRef.current;
    const observer = new IntersectionObserver(
      ([entry]) => {
        const isVisible = entry.isIntersecting;
        setIsIntersecting(isVisible);
        if (isVisible && !hasIntersected) {
          setHasIntersected(true);
        }
      },
      {
        threshold,
        root,
        rootMargin,
      }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [threshold, root, rootMargin, enabled, hasIntersected]);

  return {
    ref: elementRef,
    isIntersecting,
    hasIntersected,
  };
}
