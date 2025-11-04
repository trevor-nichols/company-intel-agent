// ------------------------------------------------------------------------------------------------
//                HeaderCard.stories.tsx - Storybook coverage for Company Intel header
// ------------------------------------------------------------------------------------------------

// ------------------------------------------------------------------------------------------------
//                Story Metadata
// ------------------------------------------------------------------------------------------------

import type { Meta, StoryObj } from '@storybook/react';

import { HeaderCard } from './HeaderCard';
import type { CompanyProfile } from '../../types';
import { companyIntelDataFixture } from '../../../../storybook/fixtures/companyIntel';

const profile = companyIntelDataFixture.profile as CompanyProfile;
const structuredProfile = companyIntelDataFixture.snapshots[0]?.summaries?.structuredProfile ?? null;

async function mockSaveIdentity() {
  await new Promise(resolve => {
    setTimeout(resolve, 300);
  });
}

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
    isScraping: false,
    isStreaming: false,
    onSaveIdentity: mockSaveIdentity,
    isSavingIdentity: false,
  },
};

export default meta;

type Story = StoryObj<typeof HeaderCard>;

export const Ready: Story = {};

export const Streaming: Story = {
  args: {
    isScraping: true,
    isStreaming: true,
  },
};

export const Failed: Story = {
  args: {
    profile: failedProfile,
    structuredProfile: null,
    profileStatus: 'failed',
  },
};
