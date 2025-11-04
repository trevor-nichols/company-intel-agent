// ------------------------------------------------------------------------------------------------
//                CompanyIntelPanel.stories.tsx - Storybook coverage for CompanyIntelPanel
// ------------------------------------------------------------------------------------------------

// ------------------------------------------------------------------------------------------------
//                Story Metadata & Providers
// ------------------------------------------------------------------------------------------------

import type { Meta, StoryObj } from '@storybook/react';
import { useEffect, useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HttpResponse, delay, http } from 'msw';

import { CompanyIntelPanel } from './CompanyIntelPanel';
import { CompanyIntelClientProvider } from './context';
import type { CompanyIntelData } from './types';
import {
  companyIntelApiPayload,
  companyIntelDataFixture,
  companyIntelReasoningApiPayload,
  companyIntelReasoningDataFixture,
  emptyCompanyIntelDataFixture,
  storyTeamId,
} from '../../storybook/fixtures/companyIntel';
import { withHandlers, companyIntelEmptyHandlers, createCompanyIntelHandlers } from '../../storybook/msw/handlers';

const API_BASE = '/api/company-intel';

interface StoryProvidersProps {
  readonly initialData: CompanyIntelData | null;
  readonly children: ReactNode;
}

function CompanyIntelStoryProviders({ initialData, children }: StoryProvidersProps) {
  const [queryClient] = useState(() => {
    const client = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          staleTime: 5 * 60 * 1000,
        },
      },
    });

    if (initialData) {
      client.setQueryData(['team-company-intel', storyTeamId], initialData);
    }

    return client;
  });

  useEffect(() => {
    return () => {
      queryClient.clear();
    };
  }, [queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      <CompanyIntelClientProvider teamId={storyTeamId}>
        {children}
      </CompanyIntelClientProvider>
    </QueryClientProvider>
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

export const Default: Story = {
  name: 'Ready Snapshot',
  render: () => (
    <CompanyIntelStoryProviders initialData={companyIntelDataFixture}>
      <CompanyIntelPanel />
    </CompanyIntelStoryProviders>
  ),
};

export const ReasoningHeadlines: Story = {
  name: 'Reasoning Headlines',
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
  name: 'Empty State',
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
