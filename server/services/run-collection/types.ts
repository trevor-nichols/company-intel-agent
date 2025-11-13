// ------------------------------------------------------------------------------------------------
//                types.ts - Shared types for the run-collection pipeline
// ------------------------------------------------------------------------------------------------

import type { Logger } from '@agenai/logging';

import type {
  CollectSiteIntelOptions,
  SiteIntelResult,
  SiteIntelScrapeOutcome,
  SiteIntelScrapeExtractResult,
  TavilyExtractDepth,
} from '../../web-search';
import type { CollectSiteIntelDependencies } from '../../web-search/collect';
import type {
  CompanyIntelRunStage,
  CompanyIntelStreamEvent,
  CompanyIntelSnapshotStructuredProfileSummary,
  CompanyProfileKeyOffering,
  CompanyProfileSnapshotStatus,
  TriggerCompanyIntelResult,
} from '@/shared/company-intel/types';
import type { CompanyIntelPersistence, CompanyIntelPageInsert, CompanyIntelProfileUpsert } from '../persistence';
import type {
  CompanyIntelStructuredPromptConfig,
  CompanyIntelStructuredOutput,
} from '../../agents/structured-profile';
import type { CompanyOverviewPromptConfig } from '../../agents/overview';
import type { OpenAIClientLike } from '../../agents/shared/openai';

export interface RunCompanyIntelCollectionParams {
  readonly domain: string;
  readonly options?: CollectSiteIntelOptions;
}

export interface RunCompanyIntelCollectionDependencies {
  readonly tavily: CollectSiteIntelDependencies['tavily'];
  readonly logger?: Logger;
  readonly openAIClient: OpenAIClientLike;
  readonly structuredOutputPrompt?: CompanyIntelStructuredPromptConfig;
  readonly structuredOutputModel?: string;
  readonly overviewPrompt?: CompanyOverviewPromptConfig;
  readonly overviewModel?: string;
  readonly persistence: CompanyIntelPersistence;
  readonly emit?: (event: CompanyIntelStreamEvent) => void;
  readonly abortSignal?: AbortSignal;
  readonly defaultExtractDepth?: TavilyExtractDepth;
}

export interface RunCompanyIntelCollectionResult {
  readonly snapshotId: number;
  readonly status: CompanyProfileSnapshotStatus;
  readonly selections: SiteIntelResult['selections'];
  readonly totalLinksMapped: number;
  readonly successfulPages: number;
  readonly failedPages: number;
}

export interface CompanyIntelPageContent {
  readonly url: string;
  readonly content: string;
  readonly title?: string;
}

export interface StructuredAnalysisResult {
  readonly summary: CompanyIntelSnapshotStructuredProfileSummary;
  readonly normalizedTagline: string | null;
  readonly reasoningHeadlines: readonly string[];
  readonly reasoningSummary: string | null;
  readonly metadata: {
    readonly responseId: string | null;
    readonly model: string | null;
    readonly usage: Record<string, unknown> | null;
    readonly rawText: string | null;
  };
  readonly faviconUrl: string | null;
  readonly rawText: string | null;
}

export interface OverviewAnalysisResult {
  readonly overview: string;
  readonly reasoningHeadlines: readonly string[];
  readonly reasoningSummary: string | null;
  readonly metadata: {
    readonly responseId: string | null;
    readonly model: string | null;
    readonly usage: Record<string, unknown> | null;
    readonly rawText: string | null;
  };
}

export type {
  CompanyIntelRunStage,
  CompanyIntelStreamEvent,
  CompanyIntelSnapshotStructuredProfileSummary,
  CompanyProfileKeyOffering,
  CompanyProfileSnapshotStatus,
  TriggerCompanyIntelResult,
  SiteIntelResult,
  SiteIntelScrapeOutcome,
  SiteIntelScrapeExtractResult,
  CompanyIntelPageInsert,
  CompanyIntelProfileUpsert,
  CompanyIntelStructuredPromptConfig,
  CompanyIntelStructuredOutput,
  CompanyOverviewPromptConfig,
};
