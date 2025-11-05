// ------------------------------------------------------------------------------------------------
//                .storybook/preview.tsx - Preview decorators for @agenai/feature-company-intel
// ------------------------------------------------------------------------------------------------

// ------------------------------------------------------------------------------------------------
//                Global Decorators & Parameters
// ------------------------------------------------------------------------------------------------

import React from 'react';
import type { Decorator, Preview } from '@storybook/react-vite';
import { withThemeByClassName } from '@storybook/addon-themes';
import { initialize, mswDecorator } from 'msw-storybook-addon';
import { ThemeProvider } from 'next-themes';

import '@/app/globals.css';
import './storybook.css';
import { defaultHandlers } from '@/__mocks__/msw/handlers';

initialize({
  onUnhandledRequest: 'bypass',
});

const withNextThemes: Decorator = (Story) => (
  <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
    <Story />
  </ThemeProvider>
);

const withSurfacePadding: Decorator = (Story) => (
  <div className="min-h-screen bg-background text-foreground antialiased font-sans p-8">
    <Story />
  </div>
);

const preview: Preview = {
  parameters: {
    actions: { argTypesRegex: '^on[A-Z].*' },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/,
      },
    },
    backgrounds: {
      options: {
        canvas: { name: 'Canvas', value: 'rgba(12,12,12,0.04)' },
        surface: { name: 'Surface', value: 'rgba(255,255,255,0.9)' },
        night: { name: 'Night', value: 'rgba(12,12,12,0.9)' }
      }
    },
    options: {
      storySort: {
        order: ['Foundations', 'Components', 'Flows'],
      },
    },
    msw: {
      handlers: defaultHandlers,
    },
  },

  decorators: [
    mswDecorator,
    withNextThemes,
    withThemeByClassName({
      themes: {
        light: 'light',
        dark: 'dark',
      },
      defaultTheme: 'light',
      attribute: 'class',
    }),
    withSurfacePadding,
  ],

  initialGlobals: {
    backgrounds: {
      value: 'canvas'
    }
  }
};

export default preview;
