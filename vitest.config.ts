import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    setupFiles: [path.resolve(__dirname, 'vitest.setup.ts')],
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx', 'src/**/__tests__/**/*.ts'],
    coverage: {
      reporter: ['text', 'lcov'],
    },
  },
  resolve: {
    alias: [
      { find: '@', replacement: path.resolve(__dirname, 'src') },
      { find: '@app', replacement: path.resolve(__dirname, 'app') },
      { find: '@agenai/logging', replacement: path.resolve(__dirname, 'src/vendor/logging.ts') },
      { find: '@agenai/config', replacement: path.resolve(__dirname, 'src/vendor/config.ts') },
      { find: '@agenai/ui', replacement: path.resolve(__dirname, 'src/vendor/ui/index.ts') },
      { find: '@agenai/ui/', replacement: path.resolve(__dirname, 'src/vendor/ui/') },
    ],
  },
});
