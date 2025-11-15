// ------------------------------------------------------------------------------------------------
//                HeaderCard.stories.tsx - Storybook coverage for Company Intel header
// ------------------------------------------------------------------------------------------------

// ------------------------------------------------------------------------------------------------
//                Story Metadata
// ------------------------------------------------------------------------------------------------

import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { HeaderCard } from './HeaderCard';
import type { CompanyProfile, CompanyProfileSnapshot } from '../../types';
import { CompanyIntelProviders } from '../../hooks';
import { companyIntelDataFixture } from '@/__mocks__/fixtures/companyIntel';
import type { CompanyIntelFetch } from '../../context/CompanyIntelClientContext';

const profile = companyIntelDataFixture.profile as CompanyProfile;
const structuredProfile = companyIntelDataFixture.snapshots[0]?.summaries?.structuredProfile ?? null;
const latestSnapshot = companyIntelDataFixture.snapshots[0] as CompanyProfileSnapshot | undefined;

async function mockSaveIdentity() {
  await new Promise(resolve => {
    setTimeout(resolve, 300);
  });
}

const mockExportFetch: CompanyIntelFetch = async (input, init) => {
  const url = typeof input === 'string' ? input : input.toString();
  if (url.includes('/export')) {
    return new Response('fake-pdf-bytes', {
      status: 200,
      headers: {
        'content-type': 'application/pdf',
        'content-disposition': 'attachment; filename="company-intel-1.pdf"',
      },
    });
  }

  return fetch(input, init);
};

const failedProfile: CompanyProfile = {
  ...profile,
  status: 'failed',
  lastError: 'Upstream provider returned consecutive 429 responses. Try again shortly.',
};

const meta: Meta<typeof HeaderCard> = {
  title: 'Company Intel/Header/HeaderCard',
  component: HeaderCard,
  args: {
    profile,
    structuredProfile,
    faviconOverride: null,
    profileStatus: profile.status,
    domainLabel: profile.domain,
    latestSnapshot: latestSnapshot ?? null,
    isScraping: false,
    isStreaming: false,
    onSaveIdentity: mockSaveIdentity,
    isSavingIdentity: false,
  },
  decorators: [
    Story => (
      <CompanyIntelProviders fetcher={mockExportFetch}>
        <Story />
      </CompanyIntelProviders>
    ),
  ],
};

export default meta;

type Story = StoryObj<typeof HeaderCard>;

export const Ready: Story = {};

export const Streaming: Story = {
  args: {
    isScraping: true,
    isStreaming: true,
    latestSnapshot: null,
  },
};

export const Failed: Story = {
  args: {
    profile: failedProfile,
    structuredProfile: null,
    profileStatus: 'failed',
    latestSnapshot: null,
  },
};
