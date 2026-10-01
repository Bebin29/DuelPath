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
