// ------------------------------------------------------------------------------------------------
//                tsup.config.ts - Runtime build orchestration for feature-company-intel - Dependencies: tsup
// ------------------------------------------------------------------------------------------------

// ------------------------------------------------------------------------------------------------
//                Build Configuration
// ------------------------------------------------------------------------------------------------

import { defineConfig } from 'tsup';

export default defineConfig({
  entry: [
    'src/**/*.ts',
    'src/**/*.tsx',
    '!src/**/*.d.ts',
    '!src/**/*.d.ts.map',
    '!src/**/*.test.ts',
    '!src/**/*.spec.ts',
    '!src/**/__tests__/**',
    '!src/**/*.stories.ts',
    '!src/**/*.stories.tsx',
    '!src/storybook/**'
  ],
  format: ['esm'],
  sourcemap: false,
  dts: false,
  tsconfig: './tsconfig.json',
  clean: false,
  bundle: false,
  splitting: false,
  treeshake: false,
  minify: false,
  target: 'node18',
  platform: 'node',
  shims: false
});
