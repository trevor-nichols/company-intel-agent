// ------------------------------------------------------------------------------------------------
//                .storybook/main.ts - Storybook configuration for @agenai/feature-company-intel
// ------------------------------------------------------------------------------------------------

// ------------------------------------------------------------------------------------------------
//                Storybook Core Configuration
// ------------------------------------------------------------------------------------------------

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { StorybookConfig } from '@storybook/react-vite';
import { mergeConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';
import tsconfigPaths from 'vite-tsconfig-paths';

const config: StorybookConfig = {
  stories: ['../components/**/*.stories.@(ts|tsx)'],

  addons: [
    '@storybook/addon-a11y',
    '@storybook/addon-themes',
    '@storybook/addon-docs'
  ],

  framework: {
    name: '@storybook/react-vite',
    options: {},
  },

  staticDirs: [],

  async viteFinal(baseConfig) {
    const dirname = path.dirname(fileURLToPath(import.meta.url));
    const rootDir = path.resolve(dirname, '..'); // repo root

    return mergeConfig(baseConfig, {
      plugins: [
        react(),
        tsconfigPaths({ projects: [path.join(rootDir, 'tsconfig.json')] })
      ],
      optimizeDeps: {
        include: ['storybook/test'],
      },
      css: {
        postcss: {
          plugins: [
            tailwindcss(path.join(rootDir, 'tailwind.config.ts')),
            autoprefixer(),
          ],
        },
      },
    });
  }
};

export default config;
