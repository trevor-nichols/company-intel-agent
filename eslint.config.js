import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { FlatCompat } from '@eslint/eslintrc';
import storybookPlugin from 'eslint-plugin-storybook';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const config = [
  {
    ignores: [
      '.next',
      'node_modules',
      'dist',
      'out',
      'coverage',
    ],
  },
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  ...storybookPlugin.configs['flat/recommended'],
];

export default config;
