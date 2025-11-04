// ------------------------------------------------------------------------------------------------
//                storybook/fixtures/companyIntel.ts - Sample data for Storybook scenarios
// ------------------------------------------------------------------------------------------------

// ------------------------------------------------------------------------------------------------
//                Fixture Definitions
// ------------------------------------------------------------------------------------------------

import type {
  CompanyIntelAgentSource,
  CompanyIntelData,
  CompanyIntelPreviewResult,
  CompanyIntelSelection,
  CompanyIntelSnapshotStructuredProfileSummary,
  CompanyIntelSnapshotSummaries,
  CompanyProfile,
  CompanyProfileKeyOffering,
  CompanyProfileSnapshot,
  CompanyProfileSnapshotStatus,
  TriggerCompanyIntelResult,
} from '../../client/company-intel/types';

export const storyTeamId = 4138;

const keyOfferings: CompanyProfileKeyOffering[] = [
  {
    title: 'Adaptive Market Intel',
    description: 'Weekly AI-generated competitor and market movement reports tailored to revenue teams.',
  },
  {
    title: 'Executive Briefing Kits',
    description: 'Polished executive-ready summaries with strategic insight and messaging guidance.',
  },
  {
    title: 'Opportunity Radar',
    description: 'Prioritised signals that reveal new geographies, industries, and customer segments.',
  },
];

const structuredSources: CompanyIntelAgentSource[] = [
  {
    page: 'About — acmeintel.ai',
    url: 'https://acmeintel.ai/about',
    rationale: 'Primary company overview with mission and positioning.',
  },
  {
    page: 'Solutions — acmeintel.ai',
    url: 'https://acmeintel.ai/solutions',
  },
  {
    page: 'Press — acmeintel.ai',
    url: 'https://acmeintel.ai/press',
    rationale: 'Highlights marquee customer stories and strategic partnerships.',
  },
];

const structuredProfileSummary: CompanyIntelSnapshotStructuredProfileSummary = {
  companyName: 'Acme Intel Systems',
  tagline: 'Market intelligence for teams that can’t wait for analysts.',
  valueProps: [
    'Daily refreshed competitive insights for GTM leads.',
    'Unified briefs that blend web, filings, and earnings calls.',
    'Clear guidance on what to do next, not just raw data.',
  ],
  keyOfferings: keyOfferings,
  primaryIndustries: ['AI Software', 'Revenue Operations', 'Market Intelligence'],
  sources: structuredSources,
};

export const companyIntelProfileFixture: CompanyProfile = {
  id: 71,
  teamId: storyTeamId,
  domain: 'https://acmeintel.ai',
  status: 'ready',
  companyName: 'Acme Intel Systems',
  tagline: 'Market intelligence for teams that can’t wait for analysts.',
  overview:
    'Acme Intel Systems translates millions of web pages, filings, and calls into focused revenue intelligence. ' +
    'Teams orchestrate outreach, GTM plays, and executive reporting with briefs designed for decision speed.',
  valueProps: structuredProfileSummary.valueProps,
  keyOfferings,
  primaryIndustries: structuredProfileSummary.primaryIndustries,
  faviconUrl: 'https://assets.agen-ai.com/storybook/acmeintel/favicon.png',
  lastSnapshotId: 3421,
  lastRefreshedAt: new Date('2024-10-14T11:15:00.000Z'),
  lastError: null,
  createdAt: new Date('2024-05-12T09:00:00.000Z'),
  updatedAt: new Date('2024-10-14T11:15:00.000Z'),
};

const completeSnapshotSummaries: CompanyIntelSnapshotSummaries = {
  structuredProfile: structuredProfileSummary,
  overview:
    'Acme Intel Systems helps revenue leaders act on competitive shifts faster than the market moves. ' +
    'The platform ingests public web pages, filings, and call transcripts, automatically surfacing actionable trends.',
  metadata: {
    structuredProfile: {
      model: 'gpt-5',
      responseId: 'resp_6f54b2d8b2',
      usage: { input_tokens: 13842, output_tokens: 1256 },
      headline: 'Framing differentiators for revenue intelligence',
      summary:
        'Highlight how Acme positions its intel stack against manual research and emphasize the executive-ready brief workflow.',
    },
    overview: {
      model: 'gpt-5',
      usage: { input_tokens: 9782, output_tokens: 842 },
      headline: 'Summarising why Acme accelerates GTM teams',
      summary:
        'Lead with the latency advantage and connect it to outcomes for sales, marketing, and customer leadership.',
    },
  },
  pagesXml: `<pages>
  <page url="https://acmeintel.ai/about" priority="1" />
  <page url="https://acmeintel.ai/platform" priority="0.9" />
  <page url="https://acmeintel.ai/customers" priority="0.85" />
</pages>`,
};

export const companyIntelSuccessfulSnapshotFixture: CompanyProfileSnapshot = {
  id: 3421,
  teamId: storyTeamId,
  domain: 'https://acmeintel.ai',
  status: 'complete',
  selectedUrls: [
    'https://acmeintel.ai/about',
    'https://acmeintel.ai/platform',
    'https://acmeintel.ai/customers',
    'https://acmeintel.ai/press/acme-lands-series-c',
  ],
  mapPayload: {
    seed: 'acmeintel.ai',
    totalDiscovered: 28,
    totalSelected: 4,
  },
  summaries: completeSnapshotSummaries,
  rawScrapes: [
    {
      url: 'https://acmeintel.ai/about',
      success: true,
      durationMs: 1840,
      response: {
        results: [
          {
            url: 'https://acmeintel.ai/about',
            markdown: '# About Acme Intel Systems\nAcme Intel Systems turns complex markets into ready-to-send briefs...',
            title: 'About Acme Intel Systems',
            text: 'Acme Intel Systems turns complex markets into ready-to-send briefs...',
            description: 'Company background and mission',
          },
        ],
        failedResults: [],
        requestId: 'req_scrape_about',
        responseTime: 1840,
      },
    },
    {
      url: 'https://acmeintel.ai/platform',
      success: true,
      durationMs: 2104,
      response: {
        results: [
          {
            url: 'https://acmeintel.ai/platform',
            markdown: '## Atlas Platform\nAtlas orchestrates AI agent workflows for revenue teams...',
            title: 'Atlas Platform',
            text: 'Atlas orchestrates AI agent workflows for revenue teams...',
            description: 'Feature overview',
          },
        ],
        failedResults: [],
        requestId: 'req_scrape_platform',
        responseTime: 2104,
      },
    },
    {
      url: 'https://acmeintel.ai/pricing',
      success: false,
      durationMs: 512,
      error: {
        name: 'NavigationTimeoutError',
        message: 'Navigation timed out after 30000 ms.',
      },
    },
  ],
  initiatedByUserId: 58,
  error: null,
  createdAt: new Date('2024-10-14T10:57:00.000Z'),
  completedAt: new Date('2024-10-14T11:15:00.000Z'),
};

export const companyIntelFailedSnapshotFixture: CompanyProfileSnapshot = {
  id: 3174,
  teamId: storyTeamId,
  domain: 'https://acmeintel.ai',
  status: 'failed',
  selectedUrls: ['https://acmeintel.ai/about'],
  mapPayload: { seed: 'acmeintel.ai', totalDiscovered: 14, totalSelected: 1 },
  summaries: null,
  rawScrapes: [
    {
      url: 'https://acmeintel.ai/about',
      success: false,
      durationMs: 640,
      error: {
        name: 'HttpError',
        message: '429 Too Many Requests',
      },
    },
  ],
  initiatedByUserId: 58,
  error: 'Upstream source rejected all requests (429).',
  createdAt: new Date('2024-09-02T15:12:00.000Z'),
  completedAt: null,
};

export const companyIntelDataFixture: CompanyIntelData = {
  profile: companyIntelProfileFixture,
  snapshots: [companyIntelSuccessfulSnapshotFixture, companyIntelFailedSnapshotFixture],
};

const reasoningHeadlineSnapshot: CompanyProfileSnapshot = {
  ...companyIntelSuccessfulSnapshotFixture,
  summaries: companyIntelSuccessfulSnapshotFixture.summaries
    ? {
        ...companyIntelSuccessfulSnapshotFixture.summaries,
        metadata: {
          ...companyIntelSuccessfulSnapshotFixture.summaries.metadata,
          structuredProfile: {
            ...companyIntelSuccessfulSnapshotFixture.summaries.metadata?.structuredProfile,
            headline: 'Key revenue levers to spotlight',
            summary: 'Focus on pipeline velocity, sales cycle compression, and cross-sell activation in the next brief.',
          },
          overview: {
            ...companyIntelSuccessfulSnapshotFixture.summaries.metadata?.overview,
            headline: 'Executive takeaway for GTM leadership',
            summary: 'Lead with how automated briefs surface risks earlier and free ops teams to intervene faster.',
          },
        },
      }
    : null,
};

export const companyIntelReasoningDataFixture: CompanyIntelData = {
  profile: {
    ...companyIntelProfileFixture,
  },
  snapshots: [reasoningHeadlineSnapshot, companyIntelFailedSnapshotFixture],
};

export const companyIntelPreviewFixture: CompanyIntelPreviewResult = {
  domain: 'acmeintel.ai',
  map: {
    baseUrl: 'https://acmeintel.ai',
    links: [
      { url: 'https://acmeintel.ai/about' },
      { url: 'https://acmeintel.ai/platform' },
      { url: 'https://acmeintel.ai/customers' },
      { url: 'https://acmeintel.ai/press/acme-lands-series-c' },
      { url: 'https://acmeintel.ai/blog/how-acme-uses-ai-for-analysis' },
    ],
    responseTime: 1240,
    requestId: 'req_preview_91a',
  },
  selections: [
    {
      url: 'https://acmeintel.ai/platform',
      score: 0.92,
      matchedSignals: ['Product overview depth', 'Pricing detail present'],
    },
    {
      url: 'https://acmeintel.ai/customers',
      score: 0.87,
      matchedSignals: ['Customer logos', 'Industry stratification'],
    },
    {
      url: 'https://acmeintel.ai/about',
      score: 0.79,
      matchedSignals: ['Company mission', 'Leadership mention'],
    },
  ],
};

export const triggerCompanyIntelResultFixture: TriggerCompanyIntelResult = {
  snapshotId: 3472,
  teamId: storyTeamId,
  status: 'pending',
  selections: companyIntelPreviewFixture.selections as readonly CompanyIntelSelection[],
  totalLinksMapped: companyIntelPreviewFixture.map.links.length,
  successfulPages: 0,
  failedPages: 0,
};

export const emptyCompanyIntelDataFixture: CompanyIntelData = {
  profile: null,
  snapshots: [],
};

export const emptyCompanyIntelApiPayload = {
  profile: null,
  snapshots: [],
};

export const emptyCompanyIntelPreviewFixture: CompanyIntelPreviewResult = {
  domain: 'acmeintel.ai',
  map: {
    baseUrl: 'https://acmeintel.ai',
    links: [],
    responseTime: 680,
    requestId: 'req_preview_empty',
  },
  selections: [],
};

export const triggerCompanyIntelEmptyResultFixture: TriggerCompanyIntelResult = {
  snapshotId: 3510,
  teamId: storyTeamId,
  status: 'complete',
  selections: [],
  totalLinksMapped: 0,
  successfulPages: 0,
  failedPages: 0,
};

function serialiseSnapshotStatus(status: CompanyProfileSnapshotStatus): CompanyProfileSnapshotStatus {
  return status;
}

function serialiseDate(value: Date | null): string | null {
  return value ? value.toISOString() : null;
}

function serialiseStructuredProfile(summary: CompanyIntelSnapshotStructuredProfileSummary | undefined | null) {
  if (!summary) {
    return null;
  }
  return {
    companyName: summary.companyName,
    tagline: summary.tagline,
    valueProps: summary.valueProps,
    keyOfferings: summary.keyOfferings,
    primaryIndustries: summary.primaryIndustries,
    sources: summary.sources,
  };
}

function serialiseSnapshotSummaries(value: CompanyIntelSnapshotSummaries | null) {
  if (!value) {
    return null;
  }

  return {
    structuredProfile: serialiseStructuredProfile(value.structuredProfile),
    overview: value.overview ?? null,
    metadata: value.metadata,
    pagesXml: value.pagesXml ?? null,
  };
}

function serialiseProfile(input: CompanyProfile) {
  return {
    ...input,
    lastRefreshedAt: serialiseDate(input.lastRefreshedAt),
    createdAt: serialiseDate(input.createdAt),
    updatedAt: serialiseDate(input.updatedAt),
  };
}

function serialiseSnapshot(input: CompanyProfileSnapshot) {
  return {
    ...input,
    status: serialiseSnapshotStatus(input.status),
    summaries: serialiseSnapshotSummaries(input.summaries),
    createdAt: serialiseDate(input.createdAt),
    completedAt: serialiseDate(input.completedAt),
  };
}

export const companyIntelApiPayload = {
  profile: serialiseProfile(companyIntelProfileFixture),
  snapshots: [companyIntelSuccessfulSnapshotFixture, companyIntelFailedSnapshotFixture].map(serialiseSnapshot),
};

const companyIntelReasoningProfile = companyIntelReasoningDataFixture.profile ?? companyIntelProfileFixture;

export const companyIntelReasoningApiPayload = {
  profile: serialiseProfile(companyIntelReasoningProfile),
  snapshots: companyIntelReasoningDataFixture.snapshots.map(serialiseSnapshot),
};
