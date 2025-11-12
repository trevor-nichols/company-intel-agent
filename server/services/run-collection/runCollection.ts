// ------------------------------------------------------------------------------------------------
//                runCollection.ts - Modular run orchestrator for company intel collection
// ------------------------------------------------------------------------------------------------

import { logger as defaultLogger } from '@agenai/logging';

import { initialiseRun, type InitialiseRunResult } from './stages/initialise';
import { mapAndScrape } from './stages/mapAndScrape';
import { runStructuredAnalysis } from './stages/structuredAnalysis';
import { runOverviewAnalysis } from './stages/overviewAnalysis';
import { persistResults } from './stages/persistResults';
import { CompanyIntelRunCancelledError } from './errors';
import type {
  RunCompanyIntelCollectionParams,
  RunCompanyIntelCollectionDependencies,
  RunCompanyIntelCollectionResult,
} from './types';

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
