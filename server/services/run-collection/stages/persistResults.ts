// ------------------------------------------------------------------------------------------------
//                persistResults.ts - Snapshot persistence and completion handling
// ------------------------------------------------------------------------------------------------

import type { Logger } from '@agenai/logging';

import type { RunContext } from '../context';
import type {
  OverviewAnalysisResult,
  StructuredAnalysisResult,
  RunCompanyIntelCollectionResult,
  TriggerCompanyIntelResult,
  SiteIntelResult,
  SiteIntelScrapeOutcome,
} from '../types';

export interface PersistResultsParams {
  readonly context: RunContext;
  readonly structured: StructuredAnalysisResult;
  readonly overview: OverviewAnalysisResult;
  readonly intelResult: SiteIntelResult;
  readonly selectedUrls: readonly string[];
  readonly successfulScrapes: readonly SiteIntelScrapeOutcome[];
  readonly pagesXml: string;
  readonly logger: Logger;
}

export async function persistResults(params: PersistResultsParams): Promise<RunCompanyIntelCollectionResult> {
  const { context, structured, overview, intelResult, selectedUrls, successfulScrapes, pagesXml, logger } = params;

  context.emitStage('persisting');
  context.throwIfCancelled('persisting');

  await context.updateSnapshot({
    summaries: {
      structuredProfile: structured.summary,
      overview: overview.overview,
      metadata: {
        structuredProfile: {
          responseId: structured.metadata.responseId,
          model: structured.metadata.model,
          usage: structured.metadata.usage ?? null,
          rawText: structured.metadata.rawText ?? null,
          headlines: structured.reasoningHeadlines,
          summary: structured.reasoningSummary,
        },
        overview: {
          responseId: overview.metadata.responseId,
          model: overview.metadata.model,
          usage: overview.metadata.usage ?? null,
          rawText: overview.metadata.rawText ?? null,
          headlines: overview.reasoningHeadlines,
          summary: overview.reasoningSummary,
        },
      },
      pagesXml,
    },
  });

  await context.updateSnapshot({
    status: 'complete',
    progress: null,
    completedAt: new Date(),
  });

  await context.upsertProfile({
    domain: intelResult.domain,
    status: 'ready',
    companyName: structured.summary.companyName ?? null,
    tagline: structured.normalizedTagline,
    overview: overview.overview,
    valueProps: structured.summary.valueProps,
    keyOfferings: structured.summary.keyOfferings,
    primaryIndustries: structured.summary.primaryIndustries,
    faviconUrl: structured.faviconUrl,
    lastSnapshotId: context.snapshot,
    activeSnapshotId: null,
    activeSnapshotStartedAt: null,
    lastRefreshedAt: new Date(),
    lastError: null,
  });

  logger.info('site-intel:persistence:success', {
    domain: intelResult.domain,
    snapshotId: context.snapshot,
    selections: selectedUrls.length,
    successes: successfulScrapes.length,
    failures: intelResult.scrapes.length - successfulScrapes.length,
  });

  const finalResult: RunCompanyIntelCollectionResult = {
    snapshotId: context.snapshot,
    status: 'complete',
    selections: intelResult.selections,
    totalLinksMapped: intelResult.map.links.length,
    successfulPages: successfulScrapes.length,
    failedPages: intelResult.scrapes.length - successfulScrapes.length,
  } satisfies RunCompanyIntelCollectionResult;

  const streamResult: TriggerCompanyIntelResult = {
    snapshotId: finalResult.snapshotId,
    status: finalResult.status,
    selections: finalResult.selections,
    totalLinksMapped: finalResult.totalLinksMapped,
    successfulPages: finalResult.successfulPages,
    failedPages: finalResult.failedPages,
  } satisfies TriggerCompanyIntelResult;

  context.emitEvent({
    type: 'run-complete',
    result: streamResult,
  });

  return finalResult;
}
