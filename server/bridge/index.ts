// ------------------------------------------------------------------------------------------------
//                bridge/index.ts - Server-side configuration contracts for company intel feature
// ------------------------------------------------------------------------------------------------

import type { Logger } from '@agenai/logging';

import type { CollectSiteIntelOptions, SiteIntelResult } from '../web-search';
import type { CollectSiteIntelDependencies } from '../web-search/collect';
import type {
  RunCompanyIntelCollectionParams,
  RunCompanyIntelCollectionResult,
} from '../services/run-collection';
import type { CompanyIntelPersistence, CompanyIntelProfileRecord, CompanyIntelSnapshotRecord } from '../services/persistence';
import type { CompanyIntelSnapshotPdfResult, GenerateSnapshotPdfParams } from '../services/snapshotPdf';
import type { OpenAIClientLike } from '../agents/shared/openai';
import type { CompanyIntelStructuredPromptConfig } from '../agents/structured-profile';
import type { CompanyOverviewPromptConfig } from '../agents/overview';
import type { UpdateCompanyIntelProfileParams } from '../services/profileUpdates';
import type { CompanyIntelStreamEvent } from '@/shared/company-intel/types';

export interface RunCollectionOverrides {
  readonly logger?: Logger;
  readonly structuredOutputPrompt?: CompanyIntelStructuredPromptConfig;
  readonly structuredOutputModel?: string;
  readonly overviewPrompt?: CompanyOverviewPromptConfig;
  readonly overviewModel?: string;
  readonly openAIClient?: OpenAIClientLike;
  readonly onEvent?: (event: CompanyIntelStreamEvent) => void;
  readonly abortSignal?: AbortSignal;
}

export interface CompanyIntelServerConfig {
  readonly tavily: CollectSiteIntelDependencies['tavily'];
  readonly openAI: OpenAIClientLike;
  readonly persistence: CompanyIntelPersistence;
  readonly logger?: Logger;
  readonly structuredOutputPrompt?: CompanyIntelStructuredPromptConfig;
  readonly structuredOutputModel?: string;
  readonly overviewPrompt?: CompanyOverviewPromptConfig;
  readonly overviewModel?: string;
}

export interface CompanyIntelServer {
  preview(
    domain: string,
    options?: CollectSiteIntelOptions,
    overrides?: { readonly logger?: Logger },
  ): Promise<SiteIntelResult>;
  runCollection(
    params: RunCompanyIntelCollectionParams,
    overrides?: RunCollectionOverrides,
  ): Promise<RunCompanyIntelCollectionResult>;
  updateProfile(
    params: UpdateCompanyIntelProfileParams,
    overrides?: { readonly logger?: Logger },
  ): Promise<CompanyIntelProfileRecord>;
  getProfile(): Promise<CompanyIntelProfileRecord | null>;
  getSnapshotHistory(limit?: number): Promise<readonly CompanyIntelSnapshotRecord[]>;
  generateSnapshotPdf(
    params: GenerateSnapshotPdfParams,
    overrides?: { readonly logger?: Logger },
  ): Promise<CompanyIntelSnapshotPdfResult>;
}
