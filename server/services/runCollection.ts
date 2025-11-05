// ------------------------------------------------------------------------------------------------
//                runCollection.ts - Orchestrates company intel collection and persistence
// ------------------------------------------------------------------------------------------------

import { logger as defaultLogger } from '@agenai/logging';

import type { OpenAIClientLike } from '../agents/shared/openai';
import {
  collectSiteIntel,
  previewSiteIntel,
  type CollectSiteIntelOptions,
  type SiteIntelResult,
  type SiteIntelScrapeOutcome,
  type SiteIntelScrapeExtractResult,
} from '../web-search';
import type { CollectSiteIntelDependencies } from '../web-search/collect';
import type {
  CompanyIntelRunStage,
  CompanyIntelStreamEvent,
  CompanyIntelSnapshotStructuredProfileSummary,
  CompanyProfileKeyOffering,
  CompanyProfileSnapshotStatus,
  TriggerCompanyIntelResult,
} from '@/shared/company-intel/types';
import type {
  CompanyIntelPersistence,
  CompanyIntelPageInsert,
  CompanyIntelProfileUpsert,
} from './persistence';
import {
  generateStructuredCompanyProfile,
  DEFAULT_STRUCTURED_PROFILE_PROMPT,
  type CompanyIntelStructuredPromptConfig,
  type CompanyIntelStructuredOutput,
} from '../agents/structured-profile';
import {
  generateCompanyOverview,
  DEFAULT_COMPANY_OVERVIEW_PROMPT,
  type CompanyOverviewPromptConfig,
} from '../agents/overview';
import {
  formatPagesAsXml,
  extractFaviconUrl,
  type CompanyIntelPageContent,
} from '../transformers';

export interface RunCompanyIntelCollectionParams {
  readonly domain: string;
  readonly options?: CollectSiteIntelOptions;
}

export interface RunCompanyIntelCollectionDependencies {
  readonly tavily: CollectSiteIntelDependencies['tavily'];
  readonly logger?: typeof defaultLogger;
  readonly openAIClient: OpenAIClientLike;
  readonly structuredOutputPrompt?: CompanyIntelStructuredPromptConfig;
  readonly structuredOutputModel?: string;
  readonly overviewPrompt?: CompanyOverviewPromptConfig;
  readonly overviewModel?: string;
  readonly persistence: CompanyIntelPersistence;
  readonly emit?: (event: CompanyIntelStreamEvent) => void;
}

export interface RunCompanyIntelCollectionResult {
  readonly snapshotId: number;
  readonly status: CompanyProfileSnapshotStatus;
  readonly selections: SiteIntelResult['selections'];
  readonly totalLinksMapped: number;
  readonly successfulPages: number;
  readonly failedPages: number;
}

export async function previewCompanyIntel(
  domain: string,
  options: CollectSiteIntelOptions = {},
  dependencies: Pick<RunCompanyIntelCollectionDependencies, 'tavily' | 'logger'>,
): Promise<SiteIntelResult> {
  const log = dependencies.logger ?? defaultLogger;

  const result = await previewSiteIntel(
    domain,
    {
      ...options,
    },
    {
      tavily: dependencies.tavily,
      logger: log,
    },
  );

  log.info('site-intel:preview:success', {
    domain: result.domain,
    selections: result.selections.length,
  });

  return result;
}

export async function runCompanyIntelCollection(
  params: RunCompanyIntelCollectionParams,
  dependencies: RunCompanyIntelCollectionDependencies,
): Promise<RunCompanyIntelCollectionResult> {
  const log = dependencies.logger ?? defaultLogger;
  const { domain, options } = params;
  const { persistence, tavily, openAIClient } = dependencies;

  const snapshot = await persistence.createSnapshot({
    domain,
  });

  let currentDomain = domain;

  const emitEvent = (
    event: Record<string, unknown> & { readonly type: CompanyIntelStreamEvent['type']; readonly domain?: string },
  ): void => {
    if (!dependencies.emit) {
      return;
    }

    dependencies.emit({
      snapshotId: snapshot.id,
      domain: event.domain ?? currentDomain,
      ...(event as Omit<CompanyIntelStreamEvent, 'snapshotId' | 'domain'>),
    } as CompanyIntelStreamEvent);
  };

  const emitStage = (stage: CompanyIntelRunStage, progress?: { readonly completed?: number; readonly total?: number }): void => {
    emitEvent({
      type: 'status',
      stage,
      ...(progress?.completed !== undefined ? { completed: progress.completed } : {}),
      ...(progress?.total !== undefined ? { total: progress.total } : {}),
    });
  };

  emitEvent({
    type: 'snapshot-created',
    status: snapshot.status,
  });

  try {
    emitStage('mapping');

    const intelResult = await collectSiteIntel(
      domain,
      {
        ...options,
      },
      {
        tavily,
        logger: log,
      },
    );

    currentDomain = intelResult.domain;

    const selectedUrls = intelResult.selections.map(selection => selection.url);
    const rawScrapes = intelResult.scrapes.map(scrape => ({
      url: scrape.url,
      success: scrape.success,
      durationMs: scrape.durationMs,
      response: scrape.success ? scrape.response : undefined,
      error: scrape.success || !scrape.error
        ? undefined
        : {
            name: scrape.error.name,
            message: scrape.error.message,
          },
    }));

    await persistence.updateSnapshot(snapshot.id, {
      domain: intelResult.domain,
      selectedUrls,
      mapPayload: intelResult.map,
      rawScrapes,
    });

    const totalScrapes = intelResult.scrapes.length;
    let processedScrapes = 0;
    const structuredPages: CompanyIntelPageContent[] = [];
    const pageRecords: CompanyIntelPageInsert[] = [];
    const successfulScrapes: SiteIntelScrapeOutcome[] = [];

    if (totalScrapes > 0) {
      emitStage('scraping', { completed: 0, total: totalScrapes });
    }

    for (const scrape of intelResult.scrapes) {
      if (scrape.success && scrape.response) {
        successfulScrapes.push(scrape);
        const document = getPrimaryDocument(scrape);
        const markdown = document?.markdown ?? document?.rawContent ?? null;
        const textFallback = document?.text ?? null;
        const html = markdown ? null : textFallback;
        const scrapedAt = new Date();
        const metadata: Record<string, unknown> = document
          ? {
              ...document,
              ...(document.images ? { images: [...document.images] } : {}),
            }
          : { url: scrape.url };
        const pageRecord: CompanyIntelPageInsert = {
          url: scrape.url,
          contentType: markdown ? 'markdown' : 'html',
          markdown,
          html,
          metadata,
          wordCount: getWordCount(markdown ?? textFallback),
          scrapedAt,
          createdAt: scrapedAt,
        };

        pageRecords.push(pageRecord);

        const pageContent = (markdown ?? textFallback ?? '').trim();
        if (pageContent.length > 0) {
          structuredPages.push({
            url: scrape.url,
            content: pageContent,
            title: document?.title ?? undefined,
          });
        }
      }

      processedScrapes += 1;
      emitStage('scraping', { completed: processedScrapes, total: totalScrapes });
    }

    await persistence.replaceSnapshotPages(snapshot.id, pageRecords);

    if (structuredPages.length === 0) {
      throw new Error('Structured extraction requires at least one page with readable content.');
    }

    const pagesXml = formatPagesAsXml(structuredPages);

    const faviconUrl = successfulScrapes
      .map(scrape => extractFaviconUrl(scrape))
      .find((value): value is string => Boolean(value)) ?? null;

    emitStage('analysis_structured');

    let structuredDeltaBuffer = '';
    let structuredReasoningSummaryBuffer = '';
    let structuredReasoningHeadline: string | null = null;
    let emittedStructuredReasoningDelta = false;
    let structuredSummaryDraft: CompanyIntelSnapshotStructuredProfileSummary | null = null;

    const structuredResult = await generateStructuredCompanyProfile(
      {
        domain: intelResult.domain,
        pages: structuredPages,
        prompt: dependencies.structuredOutputPrompt ?? DEFAULT_STRUCTURED_PROFILE_PROMPT,
        model: dependencies.structuredOutputModel,
      },
      {
        openAIClient,
        logger: log,
        onDelta: dependencies.emit
          ? ({ delta, snapshot, parsed }) => {
              if (!delta) {
                return;
              }

              structuredDeltaBuffer += delta;
              if (parsed) {
                structuredSummaryDraft = buildStructuredProfileSummary(parsed).summary;
              }
              emitEvent({
                type: 'structured-delta',
                delta,
                accumulated: structuredDeltaBuffer,
                snapshot: snapshot ?? null,
                summary: structuredSummaryDraft,
              });
            }
          : undefined,
        onReasoningDelta: dependencies.emit
          ? ({ delta, snapshot }) => {
              if (!delta) {
                return;
              }

              structuredReasoningSummaryBuffer += delta;
              structuredReasoningHeadline = extractReasoningHeadline(structuredReasoningSummaryBuffer);
              emittedStructuredReasoningDelta = true;
              emitEvent({
                type: 'structured-reasoning-delta',
                delta,
                headline: structuredReasoningHeadline,
                snapshot: snapshot ?? null,
              });
            }
          : undefined,
      },
    );

    if (!emittedStructuredReasoningDelta && structuredResult.reasoningSummary) {
      structuredReasoningSummaryBuffer = structuredResult.reasoningSummary;
      structuredReasoningHeadline = extractReasoningHeadline(structuredReasoningSummaryBuffer);
      if (dependencies.emit && structuredReasoningSummaryBuffer.length > 0) {
        emitEvent({
          type: 'structured-reasoning-delta',
          delta: structuredReasoningSummaryBuffer,
          headline: structuredReasoningHeadline,
          snapshot: null,
        });
      }
    }

    structuredReasoningHeadline = structuredReasoningHeadline ?? extractReasoningHeadline(structuredResult.reasoningSummary ?? null);

    const { summary: structuredProfileSummary, normalizedTagline } = buildStructuredProfileSummary(structuredResult.data);

    const structuredReasoningSummaryRaw = structuredReasoningSummaryBuffer || structuredResult.reasoningSummary || null;
    const structuredReasoningSummary = normalizeReasoningSummary(
      structuredReasoningSummaryRaw,
      structuredReasoningHeadline,
    );

    emitEvent({
      type: 'structured-complete',
      payload: {
        structuredProfile: structuredProfileSummary,
        metadata: {
          responseId: structuredResult.responseId,
          model: structuredResult.model,
          usage: structuredResult.usage ?? null,
          rawText: structuredResult.rawText ?? null,
          headline: structuredReasoningHeadline,
          summary: structuredReasoningSummary,
        },
        faviconUrl,
        reasoningHeadline: structuredReasoningHeadline,
      },
    });

    emitStage('analysis_overview');

    let overviewReasoningSummaryBuffer = '';
    let overviewReasoningHeadline: string | null = null;
    let emittedOverviewReasoningDelta = false;
    let overviewDraft: string | null = null;

    const overviewResult = await generateCompanyOverview(
      {
        domain: intelResult.domain,
        pages: structuredPages,
        prompt: dependencies.overviewPrompt ?? DEFAULT_COMPANY_OVERVIEW_PROMPT,
        model: dependencies.overviewModel,
      },
      {
        openAIClient,
        logger: log,
        onDelta: dependencies.emit
          ? ({ delta, snapshot: snapshotText, parsed, displayText }) => {
              const normalizedDisplayText = (() => {
                if (typeof displayText === 'string' && displayText.trim().length > 0) {
                  return displayText.trim();
                }
                if (parsed?.overview) {
                  return parsed.overview.trim();
                }
                return null;
              })();

              if (normalizedDisplayText) {
                overviewDraft = normalizedDisplayText;
              }

              const cleanDelta = typeof delta === 'string' ? delta : '';
              const hasContent = Boolean((cleanDelta && cleanDelta.length > 0) || normalizedDisplayText);
              if (!hasContent) {
                return;
              }

              emitEvent({
                type: 'overview-delta',
                delta: cleanDelta,
                snapshot: snapshotText ?? null,
                displayText: overviewDraft,
              });
            }
          : undefined,
        onReasoningDelta: dependencies.emit
          ? ({ delta, snapshot: snapshotText }) => {
              if (!delta) {
                return;
              }

              overviewReasoningSummaryBuffer += delta;
              overviewReasoningHeadline = extractReasoningHeadline(overviewReasoningSummaryBuffer);
              emittedOverviewReasoningDelta = true;
              emitEvent({
                type: 'overview-reasoning-delta',
                delta,
                headline: overviewReasoningHeadline,
                snapshot: snapshotText ?? null,
              });
            }
          : undefined,
      },
    );

    if (!emittedOverviewReasoningDelta && overviewResult.reasoningSummary) {
      overviewReasoningSummaryBuffer = overviewResult.reasoningSummary;
      overviewReasoningHeadline = extractReasoningHeadline(overviewReasoningSummaryBuffer);
      if (dependencies.emit && overviewReasoningSummaryBuffer.length > 0) {
        emitEvent({
          type: 'overview-reasoning-delta',
          delta: overviewReasoningSummaryBuffer,
          headline: overviewReasoningHeadline,
          snapshot: null,
        });
      }
    }

    overviewReasoningHeadline = overviewReasoningHeadline ?? extractReasoningHeadline(overviewResult.reasoningSummary ?? null);

    const overviewReasoningSummaryRaw = overviewReasoningSummaryBuffer || overviewResult.reasoningSummary || null;
    const overviewReasoningSummary = normalizeReasoningSummary(
      overviewReasoningSummaryRaw,
      overviewReasoningHeadline,
    );
    const overviewContent = overviewResult.data.overview.trim();

    emitEvent({
      type: 'overview-complete',
      overview: overviewContent,
      headline: overviewReasoningHeadline,
    });

    emitStage('persisting');

    await persistence.updateSnapshot(snapshot.id, {
      summaries: {
        structuredProfile: structuredProfileSummary,
        overview: overviewContent,
        metadata: {
          structuredProfile: {
            responseId: structuredResult.responseId,
            model: structuredResult.model,
            usage: structuredResult.usage ?? null,
            rawText: structuredResult.rawText ?? null,
            headline: structuredReasoningHeadline,
            summary: structuredReasoningSummary,
          },
          overview: {
            responseId: overviewResult.responseId,
            model: overviewResult.model,
            usage: overviewResult.usage ?? null,
            rawText: overviewResult.rawText ?? null,
            headline: overviewReasoningHeadline,
            summary: overviewReasoningSummary,
          },
        },
        pagesXml,
      },
    });

    await persistence.updateSnapshot(snapshot.id, {
      status: 'complete',
      completedAt: new Date(),
    });

    const profilePayload: CompanyIntelProfileUpsert = {
      domain: intelResult.domain,
      status: 'ready',
      companyName: structuredResult.data.companyName,
      tagline: normalizedTagline,
      overview: overviewContent,
      valueProps: structuredProfileSummary.valueProps,
      keyOfferings: structuredProfileSummary.keyOfferings,
      primaryIndustries: structuredProfileSummary.primaryIndustries,
      faviconUrl,
      lastSnapshotId: snapshot.id,
      lastRefreshedAt: new Date(),
      lastError: null,
    };

    await persistence.upsertProfile(profilePayload);

    log.info('site-intel:persistence:success', {
      domain: intelResult.domain,
      snapshotId: snapshot.id,
      selections: selectedUrls.length,
      successes: successfulScrapes.length,
      failures: intelResult.scrapes.length - successfulScrapes.length,
    });

    const finalResult: RunCompanyIntelCollectionResult = {
      snapshotId: snapshot.id,
      status: 'complete',
      selections: intelResult.selections,
      totalLinksMapped: intelResult.map.links.length,
      successfulPages: successfulScrapes.length,
      failedPages: intelResult.scrapes.length - successfulScrapes.length,
    };

    const streamResult: TriggerCompanyIntelResult = {
      snapshotId: finalResult.snapshotId,
      status: finalResult.status,
      selections: finalResult.selections,
      totalLinksMapped: finalResult.totalLinksMapped,
      successfulPages: finalResult.successfulPages,
      failedPages: finalResult.failedPages,
    };

    emitEvent({
      type: 'run-complete',
      result: streamResult,
    });

    return finalResult;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error collecting site intel';

    await persistence.updateSnapshot(snapshot.id, {
      status: 'failed',
      error: message,
      completedAt: new Date(),
    });

    const existingProfile = await persistence.getProfile();

    await persistence.upsertProfile({
      domain: existingProfile?.domain ?? domain,
      status: 'failed',
      companyName: existingProfile?.companyName ?? null,
      tagline: existingProfile?.tagline ?? null,
      overview: existingProfile?.overview ?? null,
      valueProps: existingProfile?.valueProps ?? [],
      keyOfferings: existingProfile?.keyOfferings ?? [],
      primaryIndustries: existingProfile?.primaryIndustries ?? [],
      faviconUrl: existingProfile?.faviconUrl ?? null,
      lastSnapshotId: snapshot.id,
      lastRefreshedAt: new Date(),
      lastError: message,
    });

    const err = error instanceof Error ? error : new Error(message);
    log.error('site-intel:persistence:failure', {
      domain,
      snapshotId: snapshot.id,
      error: { name: err.name, message: err.message },
    });

    emitEvent({
      type: 'run-error',
      message,
    });

    throw err;
  }
}
export async function getCompanyIntelSnapshotHistory(
  persistence: CompanyIntelPersistence,
  limit = 5,
) {
  return persistence.listSnapshots({ limit });
}

export function getCompanyIntelProfile(
  persistence: CompanyIntelPersistence,
) {
  return persistence.getProfile();
}

// ------------------------------------------------------------------------------------------------
//                Internal Helpers
// ------------------------------------------------------------------------------------------------

function getWordCount(markdown?: string | null): number | null {
  if (!markdown) return null;
  const words = markdown
    .replace(/[#>*_`~-]+/g, ' ')
    .replace(/\[|\]/g, ' ')
    .replace(/https?:\/\/\S+/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
  return words.length > 0 ? words.length : null;
}

function getPrimaryDocument(scrape: SiteIntelScrapeOutcome): SiteIntelScrapeExtractResult | null {
  if (!scrape.success || !scrape.response) {
    return null;
  }

  const directMatch = scrape.response.results.find(result => result.url === scrape.url);
  return directMatch ?? scrape.response.results[0] ?? null;
}

function buildStructuredProfileSummary(data: CompanyIntelStructuredOutput): {
  readonly summary: CompanyIntelSnapshotStructuredProfileSummary;
  readonly normalizedTagline: string | null;
} {
  const normalizedTagline = normalizeOptionalString(data.tagline);
  const summary: CompanyIntelSnapshotStructuredProfileSummary = {
    companyName: data.companyName,
    tagline: normalizedTagline,
    valueProps: data.valueProps
      .map(value => value.trim())
      .filter(value => value.length > 0),
    keyOfferings: data.keyOfferings.map(offering => {
      const description = normalizeOptionalString(offering.description);
      return {
        title: offering.title.trim(),
        ...(description ? { description } : {}),
      } satisfies CompanyProfileKeyOffering;
    }),
    primaryIndustries: data.primaryIndustries
      .map(industry => industry.trim())
      .filter(industry => industry.length > 0),
    sources: data.sources.map(source => {
      const rationale = normalizeOptionalString(source.rationale);
      return {
        page: source.page.trim(),
        url: source.url,
        ...(rationale ? { rationale } : {}),
      };
    }),
  };

  return { summary, normalizedTagline };
}

function normalizeOptionalString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function extractReasoningHeadline(summary: string | null): string | null {
  if (!summary) {
    return null;
  }

  const trimmed = summary.trim();
  if (trimmed.length === 0) {
    return null;
  }

  const [firstLineRaw] = trimmed.split(/\n+/);
  const firstLine = firstLineRaw ?? trimmed;
  const boldMatch = firstLine.match(/^\*\*(?<headline>.+?)\*\*$/);
  if (boldMatch?.groups?.headline) {
    return boldMatch.groups.headline.trim();
  }

  return firstLine.replace(/^\*\*/g, '').replace(/\*\*$/g, '').trim();
}

function normalizeReasoningSummary(summary: string | null, headline: string | null): string | null {
  if (!summary) {
    return null;
  }

  let trimmed = summary.trim();
  if (trimmed.length === 0) {
    return null;
  }

  const effectiveHeadline = headline?.trim();
  if (effectiveHeadline) {
    const boldHeadline = `**${effectiveHeadline}**`;
    if (trimmed.startsWith(boldHeadline)) {
      trimmed = trimmed.slice(boldHeadline.length).trimStart();
    }
  }

  trimmed = trimmed.replace(/^\n+/g, '').trim();
  return trimmed.length > 0 ? trimmed : null;
}
