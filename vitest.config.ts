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
    // ponytail: threads with max 4 workers, because forked workers time out on start in the OneDrive folder
    // (especially with next dev running); raise when the repo moves off OneDrive
    pool: 'threads',
    maxWorkers: 4,
  },
  resolve: {
    alias: {
      '@': path.resolve(process.cwd(), './src'),
    },
  },
});
