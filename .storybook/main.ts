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
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(ts|tsx)'],
  addons: [
    '@storybook/addon-essentials',
    '@storybook/addon-interactions',
    '@storybook/addon-a11y',
    '@storybook/addon-themes',
  ],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  docs: {
    autodocs: 'tag',
  },
  staticDirs: ['../../../public'],
  async viteFinal(baseConfig) {
    const dirname = path.dirname(fileURLToPath(import.meta.url));
    const rootDir = path.resolve(dirname, '../../..');
    const storybookDir = path.resolve(dirname, '.');

    return mergeConfig(baseConfig, {
      resolve: {
        alias: {
          '@': rootDir,
        },
      },
      optimizeDeps: {
        include: ['@storybook/test'],
      },
      css: {
        postcss: {
          plugins: [
            tailwindcss(path.join(storybookDir, 'tailwind.config.ts')),
            autoprefixer(),
          ],
        },
      },
    });
  },
};

export default config;
