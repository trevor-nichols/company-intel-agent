// ------------------------------------------------------------------------------------------------
//                bridge/index.ts - Server-side configuration contracts for company intel feature
// ------------------------------------------------------------------------------------------------

import type { logger as defaultLogger } from '@agenai/logging';

import type { CollectSiteIntelOptions, SiteIntelResult } from '../tavily';
import type { CollectSiteIntelDependencies } from '../tavily/collect';
import type {
  RunCompanyIntelCollectionParams,
  RunCompanyIntelCollectionResult,
} from '../services/runCollection';
import type { CompanyIntelPersistence, CompanyIntelProfileRecord, CompanyIntelSnapshotRecord } from '../services/persistence';
import type { CompanyIntelSnapshotPdfResult, GenerateSnapshotPdfParams } from '../services/snapshotPdf';
import type { OpenAIClientLike } from '../agents/shared/openai';
import type { CompanyIntelStructuredPromptConfig } from '../agents/structured-profile';
import type { CompanyOverviewPromptConfig } from '../agents/overview';
import type { UpdateCompanyIntelProfileParams } from '../services/profileUpdates';
import type { CompanyIntelStreamEvent } from '../../components/company-intel/types';

export interface RunCollectionOverrides {
  readonly logger?: typeof defaultLogger;
  readonly structuredOutputPrompt?: CompanyIntelStructuredPromptConfig;
  readonly structuredOutputModel?: string;
  readonly overviewPrompt?: CompanyOverviewPromptConfig;
  readonly overviewModel?: string;
  readonly openAIClient?: OpenAIClientLike;
  readonly onEvent?: (event: CompanyIntelStreamEvent) => void;
}

export interface CompanyIntelServerConfig {
  readonly tavily: CollectSiteIntelDependencies['tavily'];
  readonly openAI: OpenAIClientLike;
  readonly persistence: CompanyIntelPersistence;
  readonly logger?: typeof defaultLogger;
  readonly structuredOutputPrompt?: CompanyIntelStructuredPromptConfig;
  readonly structuredOutputModel?: string;
  readonly overviewPrompt?: CompanyOverviewPromptConfig;
  readonly overviewModel?: string;
}

export interface CompanyIntelServer {
  preview(
    domain: string,
    options?: CollectSiteIntelOptions,
    overrides?: { readonly logger?: typeof defaultLogger },
  ): Promise<SiteIntelResult>;
  runCollection(
    params: RunCompanyIntelCollectionParams,
    overrides?: RunCollectionOverrides,
  ): Promise<RunCompanyIntelCollectionResult>;
  updateProfile(
    params: UpdateCompanyIntelProfileParams,
    overrides?: { readonly logger?: typeof defaultLogger },
  ): Promise<CompanyIntelProfileRecord>;
  getProfile(): Promise<CompanyIntelProfileRecord | null>;
  getSnapshotHistory(limit?: number): Promise<readonly CompanyIntelSnapshotRecord[]>;
  generateSnapshotPdf(
    params: GenerateSnapshotPdfParams,
    overrides?: { readonly logger?: typeof defaultLogger },
  ): Promise<CompanyIntelSnapshotPdfResult>;
}
