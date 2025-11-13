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
    ],
    coverage: {
      reporter: ['text', 'lcov'],
    },
  },
  resolve: {
    alias: [
      { find: '@', replacement: path.resolve(__dirname) },
      { find: '@agenai/logging', replacement: path.resolve(__dirname, 'lib/logging.ts') },
      { find: '@agenai/config', replacement: path.resolve(__dirname, 'lib/config.ts') },
      { find: '@agenai/ui', replacement: path.resolve(__dirname, 'components/ui/index.ts') },
      { find: '@agenai/ui/', replacement: path.resolve(__dirname, 'components/ui/') },
    ],
  },
});
