// ------------------------------------------------------------------------------------------------
//                .storybook/tailwind.config.ts - Tailwind tokens for @agenai/feature-company-intel
// ------------------------------------------------------------------------------------------------

// ------------------------------------------------------------------------------------------------
//                Tailwind Configuration
// ------------------------------------------------------------------------------------------------

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Config } from 'tailwindcss';
import { fontFamily } from 'tailwindcss/defaultTheme';
import plugin from 'tailwindcss/plugin';
import typography from '@tailwindcss/typography';
import reactAriaComponents from 'tailwindcss-react-aria-components';
import tailwindAnimate from 'tailwindcss-animate';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(dirname, '..');

const config: Config = {
  darkMode: ['class'],
  content: [
    path.resolve(rootDir, 'components/**/*.{ts,tsx}'),
    path.resolve(rootDir, '__mocks__/**/*.{ts,tsx}'),
    path.resolve(rootDir, 'app/**/*.{ts,tsx}'),
  ],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      backdropSaturate: {
        '125': '1.25',
      },
      animation: {
        'gradient-slow': 'gradient 15s ease infinite',
        blob: 'blob 7s infinite',
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'collapsible-down': 'collapsible-down 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
        'collapsible-up': 'collapsible-up 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
      },
      keyframes: {
        gradient: {
          '0%, 100%': {
            'background-size': '200% 200%',
            'background-position': 'left center',
          },
          '50%': {
            'background-size': '200% 200%',
            'background-position': 'right center',
          },
        },
        blob: {
          '0%': { transform: 'translate(0px, 0px) scale(1)' },
          '33%': { transform: 'translate(30px, -50px) scale(1.1)' },
          '66%': { transform: 'translate(-20px, 20px) scale(0.9)' },
          '100%': { transform: 'translate(0px, 0px) scale(1)' },
        },
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
        'collapsible-down': {
          from: {
            height: '0',
            opacity: '0',
            transform: 'translateY(-8px)',
          },
          to: {
            height: 'var(--radix-collapsible-content-height)',
            opacity: '1',
            transform: 'translateY(0)',
          },
        },
        'collapsible-up': {
          from: {
            height: 'var(--radix-collapsible-content-height)',
            opacity: '1',
            transform: 'translateY(0)',
          },
          to: {
            height: '0',
            opacity: '0',
            transform: 'translateY(-8px)',
          },
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: `calc(var(--radius) - 2px)`,
        sm: `calc(var(--radius) - 4px)`,
      },
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        chart: {
          1: 'hsl(var(--chart-1))',
          2: 'hsl(var(--chart-2))',
          3: 'hsl(var(--chart-3))',
          4: 'hsl(var(--chart-4))',
          5: 'hsl(var(--chart-5))',
        },
      },
      fontFamily: {
        sans: [...fontFamily.sans],
        mono: [...fontFamily.mono],
      },
    },
  },
  plugins: [
    typography,
    reactAriaComponents,
    tailwindAnimate,
    plugin(({ addVariant }) => {
      addVariant('touch-device', '@media (hover: none) and (pointer: coarse)');
      addVariant('supports-overscroll', '@supports (-webkit-overflow-scrolling: touch)');
      addVariant('supports-overlay', '@supports (overflow: overlay)');
    }),
  ],
};

export default config;
