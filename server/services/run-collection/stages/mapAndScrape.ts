// ------------------------------------------------------------------------------------------------
//                mapAndScrape.ts - Mapping and scraping stage orchestration
// ------------------------------------------------------------------------------------------------

import type { CollectSiteIntelOptions } from '../../../web-search';
import {
  collectSiteIntel,
  type SiteIntelResult,
  type SiteIntelScrapeOutcome,
} from '../../../web-search';
import { formatPagesAsXml, extractFaviconUrl } from '../../../transformers';
import type { CompanyIntelPageInsert } from '../../persistence';
import type { CompanyIntelPageContent } from '../types';
import type { RunContext } from '../context';
import type { RunCompanyIntelCollectionDependencies } from '../types';
import { getPrimaryDocument, getWordCount } from '../helpers/scraping';

export interface MapAndScrapeResult {
  readonly intelResult: SiteIntelResult;
  readonly structuredPages: CompanyIntelPageContent[];
  readonly successfulScrapes: SiteIntelScrapeOutcome[];
  readonly selectedUrls: string[];
  readonly pagesXml: string;
  readonly faviconUrl: string | null;
}

export async function mapAndScrape(
  context: RunContext,
  domain: string,
  options: CollectSiteIntelOptions | undefined,
  dependencies: Pick<RunCompanyIntelCollectionDependencies, 'tavily' | 'logger'>,
): Promise<MapAndScrapeResult> {
  const log = dependencies.logger ?? context.logger;

  context.emitStage('mapping');

  const intelResult = await collectSiteIntel(
    domain,
    {
      ...options,
    },
    {
      tavily: dependencies.tavily,
      logger: log,
    },
  );

  context.updateDomain(intelResult.domain);
  context.throwIfCancelled('mapping');

  const selectedUrls = intelResult.selections.map((selection): string => selection.url);
  const rawScrapes = intelResult.scrapes.map((scrape): Record<string, unknown> => ({
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

  await context.updateSnapshot({
    domain: intelResult.domain,
    selectedUrls,
    mapPayload: intelResult.map,
    rawScrapes,
    status: 'running',
  });

  const totalScrapes = intelResult.scrapes.length;
  let processedScrapes = 0;
  const structuredPages: CompanyIntelPageContent[] = [];
  const pageRecords: CompanyIntelPageInsert[] = [];
  const successfulScrapes: SiteIntelScrapeOutcome[] = [];

  if (totalScrapes > 0) {
    context.emitStage('scraping', { completed: 0, total: totalScrapes });
  }

  for (const scrape of intelResult.scrapes) {
    context.throwIfCancelled('scraping');

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
      } satisfies CompanyIntelPageInsert;

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
    context.emitStage('scraping', { completed: processedScrapes, total: totalScrapes });
  }

  await context.replaceSnapshotPages(pageRecords);

  if (structuredPages.length === 0) {
    throw new Error('Structured extraction requires at least one page with readable content.');
  }

  const pagesXml = formatPagesAsXml(structuredPages);

  const faviconUrl = successfulScrapes
    .map(scrape => extractFaviconUrl(scrape))
    .find((value): value is string => Boolean(value)) ?? null;

  return {
    intelResult,
    structuredPages,
    successfulScrapes,
    selectedUrls,
    pagesXml,
    faviconUrl,
  } satisfies MapAndScrapeResult;
}
