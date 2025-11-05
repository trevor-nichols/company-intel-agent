// ------------------------------------------------------------------------------------------------
//                server.ts - Factory for company intel server operations
// ------------------------------------------------------------------------------------------------

import { logger as defaultLogger } from '@agenai/logging';

import {
  previewCompanyIntel,
  runCompanyIntelCollection,
  getCompanyIntelSnapshotHistory as getSnapshotHistoryInternal,
  getCompanyIntelProfile as getProfileInternal,
  updateCompanyIntelProfile,
  generateSnapshotPdf as generateSnapshotPdfInternal,
  type RunCompanyIntelCollectionParams,
  type RunCompanyIntelCollectionResult,
  type GenerateSnapshotPdfParams,
  type CompanyIntelSnapshotPdfResult,
} from './services';
import type { CollectSiteIntelOptions, SiteIntelResult } from './web-search';
import type { CompanyIntelServer, CompanyIntelServerConfig, RunCollectionOverrides } from './bridge';

export function createCompanyIntelServer(config: CompanyIntelServerConfig): CompanyIntelServer {
  const {
    tavily,
    openAI,
    persistence,
    logger: baseLogger = defaultLogger,
    structuredOutputPrompt,
    structuredOutputModel,
    overviewPrompt,
    overviewModel,
  } = config;

  return {
    preview(
      domain: string,
      options: CollectSiteIntelOptions = {},
      overrides?: { readonly logger?: typeof defaultLogger },
    ): Promise<SiteIntelResult> {
      const logger = overrides?.logger ?? baseLogger;
      return previewCompanyIntel(
        domain,
        options,
        {
          tavily,
          logger,
        },
      );
    },

    runCollection(
      params: RunCompanyIntelCollectionParams,
      overrides: RunCollectionOverrides = {},
    ): Promise<RunCompanyIntelCollectionResult> {
      return runCompanyIntelCollection(params, {
        tavily,
        openAIClient: overrides.openAIClient ?? openAI,
        persistence,
        logger: overrides.logger ?? baseLogger,
        structuredOutputPrompt: overrides.structuredOutputPrompt ?? structuredOutputPrompt,
        structuredOutputModel: overrides.structuredOutputModel ?? structuredOutputModel,
        overviewPrompt: overrides.overviewPrompt ?? overviewPrompt,
        overviewModel: overrides.overviewModel ?? overviewModel,
        emit: overrides.onEvent,
      });
    },

    updateProfile(parameters, overrides) {
      return updateCompanyIntelProfile(
        parameters,
        {
          persistence,
          logger: overrides?.logger ?? baseLogger,
        },
      );
    },

    getProfile() {
      return getProfileInternal(persistence);
    },

    getSnapshotHistory(limit?: number) {
      return getSnapshotHistoryInternal(persistence, limit);
    },

    generateSnapshotPdf(params: GenerateSnapshotPdfParams, overrides?: { readonly logger?: typeof defaultLogger }): Promise<CompanyIntelSnapshotPdfResult> {
      return generateSnapshotPdfInternal(params, {
        persistence,
        logger: overrides?.logger ?? baseLogger,
      });
    },
  };
}
