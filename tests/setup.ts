import '@testing-library/jest-dom';
import { expect, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

/**
 * Vitest Setup-Datei
 * 
 * Konfiguriert Testing Library und bereinigt nach jedem Test
 */
afterEach(() => {
  cleanup();
});

