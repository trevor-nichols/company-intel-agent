// ------------------------------------------------------------------------------------------------
//                RunIntelForm.stories.tsx - Storybook coverage for Company Intel runner controls
// ------------------------------------------------------------------------------------------------

// ------------------------------------------------------------------------------------------------
//                Story Metadata & Utilities
// ------------------------------------------------------------------------------------------------

import type { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';

import { RunIntelForm } from './RunIntelForm';
import {
  companyIntelPreviewFixture,
  triggerCompanyIntelResultFixture,
} from '../../../../storybook/fixtures/companyIntel';

const noopAsync = async () => {
  /* story noop */
};

const baseArgs = {
  domain: 'https://acmeintel.ai',
  trimmedDomain: 'https://acmeintel.ai',
  onDomainChange: action('domain-change'),
  submit: noopAsync,
  startOver: action('start-over'),
  isBusy: false,
  isPreviewing: false,
  isScraping: false,
  hasPreview: false,
  errorMessage: null,
  manualError: null,
  statusMessages: [] as string[],
  manualUrl: '',
  onManualUrlChange: action('manual-url-change'),
  addManualUrl: action('add-manual-url'),
  removeManualUrl: action('remove-manual-url') as (url: string) => void,
  toggleSelection: action('toggle-selection') as (url: string, checked: boolean) => void,
  selectedUrls: [] as string[],
  recommendedSelections: [] as typeof companyIntelPreviewFixture.selections,
  manualSelectedUrls: [] as string[],
  previewData: null,
};

const meta: Meta<typeof RunIntelForm> = {
  title: 'Company Intel/RunIntelForm',
  component: RunIntelForm,
  args: baseArgs,
};

export default meta;

type Story = StoryObj<typeof RunIntelForm>;

export const Idle: Story = {};

export const MappingSite: Story = {
  args: {
    isBusy: true,
    isPreviewing: true,
    statusMessages: ['Discovering pages across acmeintel.ai…'],
  },
};

export const SelectionsReady: Story = {
  args: {
    hasPreview: true,
    previewData: companyIntelPreviewFixture,
    recommendedSelections: companyIntelPreviewFixture.selections,
    selectedUrls: companyIntelPreviewFixture.selections.slice(0, 2).map(selection => selection.url),
    manualSelectedUrls: ['https://acmeintel.ai/investors'],
    statusMessages: ['Mapping finished — select pages to scrape.'],
  },
};

export const ScrapingInProgress: Story = {
  args: {
    hasPreview: true,
    isBusy: true,
    isScraping: true,
    previewData: companyIntelPreviewFixture,
    recommendedSelections: companyIntelPreviewFixture.selections,
    selectedUrls: triggerCompanyIntelResultFixture.selections.map(selection => selection.url),
    statusMessages: ['Scraping 2 of 4 pages', 'Generating structured profile insights…'],
  },
};

export const PreviewError: Story = {
  args: {
    errorMessage: 'We hit a rate limit while mapping the domain. Try again in a minute.',
  },
};
