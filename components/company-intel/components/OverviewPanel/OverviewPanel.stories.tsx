// ------------------------------------------------------------------------------------------------
//                OverviewPanel.stories.tsx - Storybook coverage for structured intel overview
// ------------------------------------------------------------------------------------------------

// ------------------------------------------------------------------------------------------------
//                Story Metadata
// ------------------------------------------------------------------------------------------------

import type { Meta, StoryObj } from '@storybook/react-vite';

import { OverviewPanel } from './OverviewPanel';
import { companyIntelDataFixture } from '../../../../__mocks__/fixtures/companyIntel';

const profile = companyIntelDataFixture.profile!;
const structuredProfile = companyIntelDataFixture.snapshots[0]?.summaries?.structuredProfile ?? null;

const asyncNoop = async () => {
  await new Promise(resolve => setTimeout(resolve, 150));
};

const baseArgs = {
  profile,
  structuredProfile,
  isLoading: false,
  isStreaming: false,
  isScraping: false,
  overviewHeadlines: ['Executive reasoning focus'],
  structuredHeadlines: ['Structured profile reasoning'],
  onSaveOverview: asyncNoop,
  onSavePrimaryIndustries: asyncNoop,
  onSaveValueProps: asyncNoop,
  onSaveKeyOfferings: asyncNoop,
  isSavingOverview: false,
  isSavingPrimaryIndustries: false,
  isSavingValueProps: false,
  isSavingKeyOfferings: false,
};

const meta: Meta<typeof OverviewPanel> = {
  title: 'Company Intel/OverviewPanel',
  component: OverviewPanel,
  args: baseArgs,
};

export default meta;

type Story = StoryObj<typeof OverviewPanel>;

export const Populated: Story = {};

export const StreamingUpdate: Story = {
  args: {
    isStreaming: true,
  },
};

export const Loading: Story = {
  args: {
    isLoading: true,
  },
};

export const EmptyState: Story = {
  args: {
    profile: null,
    structuredProfile: null,
  },
};

export const RetryAfterFailure: Story = {
  args: {
    profile: {
      ...profile,
      overview: null,
      valueProps: [],
      primaryIndustries: [],
      keyOfferings: [],
    },
    structuredProfile: null,
  },
};
