import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: [path.resolve(__dirname, 'vitest.setup.ts')],
    include: [
      'app/**/__tests__/**/*.{ts,tsx}',
      'components/**/*.test.{ts,tsx}',
      'components/**/__tests__/**/*.{ts,tsx}',
      'server/**/*.test.{ts,tsx}',
      'server/**/__tests__/**/*.{ts,tsx}',
      'shared/**/*.test.{ts,tsx}',
      'shared/**/__tests__/**/*.{ts,tsx}',
      'features/company-intel/src/**/*.test.{ts,tsx}',
      'features/company-intel/src/**/__tests__/**/*.{ts,tsx}',
    ],
    coverage: {
      reporter: ['text', 'lcov'],
    },
  },
  resolve: {
    alias: [
      { find: '@', replacement: path.resolve(__dirname) },
      { find: '@company-intel/logging', replacement: path.resolve(__dirname, 'features/company-intel/src/config/logging.ts') },
      { find: '@company-intel/config', replacement: path.resolve(__dirname, 'features/company-intel/src/config/env.ts') },
      { find: '@company-intel/ui/company-intel', replacement: path.resolve(__dirname, 'features/company-intel/src/ui/company-intel/index.ts') },
      { find: '@company-intel/ui/company-intel/', replacement: path.resolve(__dirname, 'features/company-intel/src/ui/company-intel/') },
      { find: '@company-intel/ui', replacement: path.resolve(__dirname, 'features/company-intel/src/ui/primitives/index.ts') },
      { find: '@company-intel/ui/', replacement: path.resolve(__dirname, 'features/company-intel/src/ui/primitives/') },
      { find: '@company-intel/shared/', replacement: path.resolve(__dirname, 'features/company-intel/src/shared/') },
      { find: '@company-intel/shared', replacement: path.resolve(__dirname, 'features/company-intel/src/shared/index.ts') },
      { find: '@company-intel/server/', replacement: path.resolve(__dirname, 'features/company-intel/src/server/') },
      { find: '@company-intel/server', replacement: path.resolve(__dirname, 'features/company-intel/src/server/index.ts') },
      { find: '@company-intel/feature/', replacement: path.resolve(__dirname, 'features/company-intel/src/') },
      { find: '@company-intel/feature', replacement: path.resolve(__dirname, 'features/company-intel/src/index.ts') },
    ],
  },
  plugins: [],
});
