import '@testing-library/jest-dom/vitest';
import '@/lib/i18n/config';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

/**
 * Vitest Setup-Datei
 *
 * Konfiguriert Testing Library, lädt die echten Übersetzungen und bereinigt nach jedem Test
 */
afterEach(() => {
  cleanup();
});

/**
 * jsdom kennt weder `matchMedia` noch `scrollIntoView` noch `IntersectionObserver`. Das brauchen
 * Komponenten mit Motion (auch `whileInView`) und mit mitlaufender Auswahl, deshalb stehen hier
 * ruhige Attrappen.
 */
if (typeof window !== 'undefined') {
  window.matchMedia ??= ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as typeof window.matchMedia;
  Element.prototype.scrollIntoView ??= () => {};
  window.IntersectionObserver ??= class {
    readonly root = null;
    readonly rootMargin = '';
    readonly thresholds = [];
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return [];
    }
  } as unknown as typeof IntersectionObserver;
}
