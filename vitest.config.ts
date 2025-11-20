import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

/**
 * Vitest Konfiguration für DuelPath
 *
 * Unterstützt:
 * - React Testing Library
 * - Path-Aliases (@/)
 * - jsdom als Test-Umgebung
 */
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: ['**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    exclude: ['node_modules', '.next', 'out', 'build', 'dist'],
  },
  resolve: {
    alias: {
      '@': path.resolve(process.cwd(), './'),
    },
  },
});
