// ------------------------------------------------------------------------------------------------
//                runCollection.ts - Modular run orchestrator for company intel collection
// ------------------------------------------------------------------------------------------------

import { logger as defaultLogger } from '@company-intel/logging';

import { initialiseRun, type InitialiseRunResult } from './stages/initialise';
import { mapAndScrape } from './stages/mapAndScrape';
import { runStructuredAnalysis } from './stages/structuredAnalysis';
import { runOverviewAnalysis } from './stages/overviewAnalysis';
import { persistResults } from './stages/persistResults';
import { CompanyIntelRunCancelledError } from './errors';
import { publishVectorStoreKnowledge } from '../vectorStorePublisher';
import type {
  RunCompanyIntelCollectionParams,
  RunCompanyIntelCollectionDependencies,
  RunCompanyIntelCollectionResult,
  CompanyIntelPageContent,
  TriggerCompanyIntelResult,
} from './types';
import type { RunContext } from './context';

export async function runCompanyIntelCollection(
  params: RunCompanyIntelCollectionParams,
  dependencies: RunCompanyIntelCollectionDependencies,
): Promise<RunCompanyIntelCollectionResult> {
  const log = dependencies.logger ?? defaultLogger;

  const init = await initialiseRun(params, {
    ...dependencies,
    logger: log,
  });

  const { context, normalizedDomain, previousProfileState } = init;

  try {
    const mapping = await mapAndScrape(
      context,
      normalizedDomain,
      params.options,
      {
        tavily: dependencies.tavily,
        logger: log,
        defaultExtractDepth: dependencies.defaultExtractDepth,
      },
    );

    const structured = await runStructuredAnalysis(
      context,
      {
        domain: mapping.intelResult.domain,
        pages: mapping.structuredPages,
        faviconUrl: mapping.faviconUrl,
      },
      {
        openAIClient: dependencies.openAIClient,
        logger: log,
        structuredOutputPrompt: dependencies.structuredOutputPrompt,
        structuredOutputModel: dependencies.structuredOutputModel,
        structuredReasoningEffort: dependencies.structuredReasoningEffort,
      },
    );

    const overview = await runOverviewAnalysis(
      context,
      {
        domain: mapping.intelResult.domain,
        pages: mapping.structuredPages,
      },
      {
        openAIClient: dependencies.openAIClient,
        logger: log,
        overviewPrompt: dependencies.overviewPrompt,
        overviewModel: dependencies.overviewModel,
        overviewReasoningEffort: dependencies.overviewReasoningEffort,
      },
    );

    const result = await persistResults({
      context,
      structured,
      overview,
      intelResult: mapping.intelResult,
      selectedUrls: mapping.selectedUrls,
      successfulScrapes: mapping.successfulScrapes,
      pagesXml: mapping.pagesXml,
      logger: log,
    });

    await publishSnapshotKnowledgeBase({
      context,
      pages: mapping.structuredPages,
      domain: mapping.intelResult.domain,
      openAIClient: dependencies.openAIClient,
      logger: log,
    });

    const completionPayload: TriggerCompanyIntelResult = {
      snapshotId: result.snapshotId,
      status: result.status,
      selections: result.selections,
      totalLinksMapped: result.totalLinksMapped,
      successfulPages: result.successfulPages,
      failedPages: result.failedPages,
    } satisfies TriggerCompanyIntelResult;

    context.emitEvent({
      type: 'run-complete',
      result: completionPayload,
    });

    return result;
  } catch (error) {
    if (error instanceof CompanyIntelRunCancelledError) {
      await handleCancellation({
        context,
        error,
        normalizedDomain,
        previousProfileState,
        existingProfile: init.existingProfile,
      });
      throw error;
    }

    const handledError = await handleFailure({
      context,
      error,
      normalizedDomain,
      previousProfileState,
      logger: log,
      existingProfile: init.existingProfile,
    });

    throw handledError;
  }
}

interface PublishKnowledgeBaseParams {
  readonly context: RunContext;
  readonly pages: readonly CompanyIntelPageContent[];
  readonly domain: string;
  readonly openAIClient: RunCompanyIntelCollectionDependencies['openAIClient'];
  readonly logger: typeof defaultLogger;
}

async function publishSnapshotKnowledgeBase(params: PublishKnowledgeBaseParams): Promise<void> {
  const { context, pages, domain, openAIClient, logger } = params;
  if (pages.length === 0) {
    logger.warn('vector-store:publish:skipped', {
      snapshotId: context.snapshot,
      reason: 'no_pages',
    });
    await context.updateSnapshot({
      vectorStoreStatus: 'failed',
      vectorStoreError: 'No readable pages were indexed for this snapshot.',
      vectorStoreFileCounts: null,
      vectorStoreId: null,
    });
    context.emitEvent({
      type: 'vector-store-status',
      status: 'failed',
      error: 'No readable pages were indexed for this snapshot.',
    });
    return;
  }

  await context.updateSnapshot({
    vectorStoreStatus: 'publishing',
    vectorStoreError: null,
  });
  context.emitEvent({
    type: 'vector-store-status',
    status: 'publishing',
  });

  try {
    const result = await publishVectorStoreKnowledge({
      snapshotId: context.snapshot,
      domain,
      pages,
      openAIClient,
      logger,
    });

    await context.updateSnapshot({
      vectorStoreId: result.vectorStoreId,
      vectorStoreStatus: 'ready',
      vectorStoreFileCounts: result.fileCounts,
    });
    context.emitEvent({
      type: 'vector-store-status',
      status: 'ready',
      vectorStoreId: result.vectorStoreId,
      fileCounts: result.fileCounts,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Vector store publishing failed';
    logger.error('vector-store:publish:error', {
      snapshotId: context.snapshot,
      error: error instanceof Error ? { name: error.name, message: error.message } : error ?? null,
    });
    await context.updateSnapshot({
      vectorStoreStatus: 'failed',
      vectorStoreError: message,
    });
    context.emitEvent({
      type: 'vector-store-status',
      status: 'failed',
      error: message,
    });
  }
}

interface CancellationPayload {
  readonly context: InitialiseRunResult['context'];
  readonly error: CompanyIntelRunCancelledError;
  readonly normalizedDomain: string;
  readonly previousProfileState: InitialiseRunResult['previousProfileState'];
  readonly existingProfile: InitialiseRunResult['existingProfile'];
}

async function handleCancellation(payload: CancellationPayload): Promise<void> {
  const { context, error, normalizedDomain, previousProfileState, existingProfile } = payload;
  const reason = context.getCancellationReason() ?? error.message;

  await context.deleteSnapshot();

  await context.upsertProfile({
    domain: existingProfile?.domain ?? normalizedDomain,
    status: previousProfileState.snapshotId ? previousProfileState.status : 'not_configured',
    companyName: previousProfileState.companyName,
    tagline: previousProfileState.tagline,
    overview: previousProfileState.overview,
    valueProps: [...previousProfileState.valueProps],
    keyOfferings: previousProfileState.keyOfferings.map(offering => ({ ...offering })),
    primaryIndustries: [...previousProfileState.primaryIndustries],
    faviconUrl: previousProfileState.faviconUrl,
    lastSnapshotId: previousProfileState.snapshotId,
    activeSnapshotId: null,
    activeSnapshotStartedAt: null,
    lastRefreshedAt: previousProfileState.lastRefreshedAt,
    lastError: previousProfileState.lastError,
  });

  context.emitEvent({
    type: 'run-cancelled',
    reason,
  });
}

interface FailurePayload {
  readonly context: InitialiseRunResult['context'];
  readonly error: unknown;
  readonly normalizedDomain: string;
  readonly previousProfileState: InitialiseRunResult['previousProfileState'];
  readonly logger: typeof defaultLogger;
  readonly existingProfile: InitialiseRunResult['existingProfile'];
}

async function handleFailure(payload: FailurePayload): Promise<Error> {
  const { context, error, normalizedDomain, previousProfileState, logger, existingProfile } = payload;

  const message = error instanceof Error ? error.message : 'Unknown error collecting site intel';

  await context.updateSnapshot({
    status: 'failed',
    error: message,
    progress: null,
    completedAt: new Date(),
  });

  const profileAfterFailure = await context.getProfile();

  await context.upsertProfile({
    domain: profileAfterFailure?.domain ?? existingProfile?.domain ?? normalizedDomain,
    status: 'failed',
    companyName: profileAfterFailure?.companyName ?? previousProfileState.companyName,
    tagline: profileAfterFailure?.tagline ?? previousProfileState.tagline,
    overview: profileAfterFailure?.overview ?? previousProfileState.overview,
    valueProps: profileAfterFailure?.valueProps ?? [...previousProfileState.valueProps],
    keyOfferings: profileAfterFailure?.keyOfferings ?? previousProfileState.keyOfferings.map(offering => ({ ...offering })),
    primaryIndustries: profileAfterFailure?.primaryIndustries ?? [...previousProfileState.primaryIndustries],
    faviconUrl: profileAfterFailure?.faviconUrl ?? previousProfileState.faviconUrl,
    lastSnapshotId: context.snapshot,
    activeSnapshotId: null,
    activeSnapshotStartedAt: null,
    lastRefreshedAt: new Date(),
    lastError: message,
  });

  const err = error instanceof Error ? error : new Error(message);
  logger.error('site-intel:persistence:failure', {
    domain: normalizedDomain,
    snapshotId: context.snapshot,
    error: { name: err.name, message: err.message },
  });

  context.emitEvent({
    type: 'run-error',
    message,
  });

  return err;
}
