// ------------------------------------------------------------------------------------------------
//                CompanyIntelPanel.stories.tsx - Storybook coverage for CompanyIntelPanel
// ------------------------------------------------------------------------------------------------

// ------------------------------------------------------------------------------------------------
//                Story Metadata & Providers
// ------------------------------------------------------------------------------------------------

import type { Meta, StoryObj } from '@storybook/react-vite';
import React, { useState, type ReactNode } from 'react';
import { HttpResponse, delay, http } from 'msw';
import { within, userEvent } from '@storybook/testing-library';

import { CompanyIntelPanel } from './CompanyIntelPanel';
import { CompanyIntelProviders, createCompanyIntelQueryClient } from './hooks';
import type { CompanyIntelData } from './types';
import {
  companyIntelApiPayload,
  companyIntelDataFixture,
  companyIntelReasoningApiPayload,
  companyIntelReasoningDataFixture,
  emptyCompanyIntelDataFixture,
  emptyCompanyIntelApiPayload,
  companyIntelPreviewFixture,
  triggerCompanyIntelEmptyResultFixture,
} from '@/__mocks__/fixtures/companyIntel';
import {
  withHandlers,
  companyIntelEmptyHandlers,
  createCompanyIntelHandlers,
} from '@/__mocks__/msw/handlers';

const API_BASE = '/api/company-intel';

interface StoryProvidersProps {
  readonly initialData: CompanyIntelData | null;
  readonly children: ReactNode;
}

function CompanyIntelStoryProviders({ initialData, children }: StoryProvidersProps) {
  const [queryClient] = useState(() => {
    const client = createCompanyIntelQueryClient({
      queries: {
        retry: false,
        staleTime: 5 * 60 * 1000,
      },
    });

    if (initialData) {
      client.setQueryData(['company-intel'], initialData);
    }

    return client;
  });

  return (
    <CompanyIntelProviders queryClient={queryClient} resetOnUnmount>
      {children}
    </CompanyIntelProviders>
  );
}

const meta: Meta<typeof CompanyIntelPanel> = {
  title: 'Company Intel/Page Overview',
  component: CompanyIntelPanel,
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;

type Story = StoryObj<typeof CompanyIntelPanel>;

const previewScenarioHandlers = createCompanyIntelHandlers({
  payload: emptyCompanyIntelApiPayload,
  preview: companyIntelPreviewFixture,
  triggerResult: triggerCompanyIntelEmptyResultFixture,
  streamEvents: null,
});

const [emptyGetHandler, defaultPreviewHandler] = previewScenarioHandlers;

const mappingInProgressHandlers = withHandlers(
  emptyGetHandler,
  http.post(`${API_BASE}/preview`, async () => {
    await delay('infinite');
    return HttpResponse.json({ data: companyIntelPreviewFixture });
  }),
);

const previewCompleteHandlers = withHandlers(emptyGetHandler, defaultPreviewHandler);

async function simulateMapSite(canvasElement: HTMLElement, domain = 'acmeintel.ai') {
  const canvas = within(canvasElement);
  const user = userEvent.setup();
  const domainInput = await canvas.findByLabelText(/company website/i);
  await user.clear(domainInput);
  await user.type(domainInput, domain);
  const mapButton = await canvas.findByRole('button', { name: /map site/i });
  await user.click(mapButton);
  return canvas;
}

export const Default: Story = {
  name: 'Ready Snapshot',
  render: () => (
    <CompanyIntelStoryProviders initialData={companyIntelDataFixture}>
      <CompanyIntelPanel />
    </CompanyIntelStoryProviders>
  ),
};

export const ReasoningHeadlines: Story = {
  render: () => (
    <CompanyIntelStoryProviders initialData={companyIntelReasoningDataFixture}>
      <CompanyIntelPanel />
    </CompanyIntelStoryProviders>
  ),
  parameters: {
    msw: {
      handlers: withHandlers(
        ...createCompanyIntelHandlers({ payload: companyIntelReasoningApiPayload }),
      ),
    },
  },
};

export const Loading: Story = {
  render: () => (
    <CompanyIntelStoryProviders initialData={null}>
      <CompanyIntelPanel />
    </CompanyIntelStoryProviders>
  ),
  parameters: {
    msw: {
      handlers: withHandlers(
        http.get(API_BASE, async () => {
          await delay('infinite');
          return HttpResponse.json({ data: companyIntelApiPayload });
        }),
      ),
    },
  },
};

export const EmptyState: Story = {
  render: () => (
    <CompanyIntelStoryProviders initialData={emptyCompanyIntelDataFixture}>
      <CompanyIntelPanel />
    </CompanyIntelStoryProviders>
  ),
  parameters: {
    msw: {
      handlers: withHandlers(...companyIntelEmptyHandlers),
    },
  },
};

export const MappingInProgress: Story = {
  render: () => (
    <CompanyIntelStoryProviders initialData={emptyCompanyIntelDataFixture}>
      <CompanyIntelPanel />
    </CompanyIntelStoryProviders>
  ),
  parameters: {
    msw: {
      handlers: mappingInProgressHandlers,
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = await simulateMapSite(canvasElement);
    await canvas.findByRole('button', { name: /mapping site/i });
  },
};

export const PreviewComplete: Story = {
  render: () => (
    <CompanyIntelStoryProviders initialData={emptyCompanyIntelDataFixture}>
      <CompanyIntelPanel />
    </CompanyIntelStoryProviders>
  ),
  parameters: {
    msw: {
      handlers: previewCompleteHandlers,
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = await simulateMapSite(canvasElement);
    await canvas.findByRole('button', { name: /analyze selected pages/i });
    await canvas.findByText('/platform');
  },
};
