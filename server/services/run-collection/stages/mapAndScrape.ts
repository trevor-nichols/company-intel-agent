// ------------------------------------------------------------------------------------------------
//                mapAndScrape.ts - Mapping and scraping stage orchestration
// ------------------------------------------------------------------------------------------------

import type { CollectSiteIntelOptions } from '../../../web-search';
import {
  collectSiteIntel,
  type SiteIntelResult,
  type SiteIntelScrapeExtractResult,
  type SiteIntelScrapeOutcome,
} from '../../../web-search';
import { formatPagesAsXml, extractFaviconUrl } from '../../../transformers';
import type { CompanyIntelPageInsert } from '../../persistence';
import type { CompanyIntelPageContent } from '../types';
import type { RunContext } from '../context';
import type { RunCompanyIntelCollectionDependencies } from '../types';
import { getPrimaryDocument, getWordCount } from '../helpers/scraping';

export function stripHtml(content: string): string {
  let working = content
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ');

  working = working
    .replace(/<br\s*\/?\s*>/gi, '\n')
    .replace(/<li[^>]*>/gi, '\n- ')
    .replace(/<\/(li)\s*>/gi, '\n')
    .replace(/<\/(p|div|section|article|header|footer|aside|main|nav|blockquote)\s*>/gi, '\n\n')
    .replace(/<(p|div|section|article|header|footer|aside|main|nav|blockquote)[^>]*>/gi, '\n')
    .replace(/<\/(h[1-6]|tr)\s*>/gi, '\n')
    .replace(/<(h[1-6]|tr)[^>]*>/gi, '\n')
    .replace(/<\/(td|th)\s*>/gi, '\t')
    .replace(/<(td|th)[^>]*>/gi, '\t')
    .replace(/<\/(ul|ol|tbody|thead|tfoot|table)\s*>/gi, '\n')
    .replace(/<(ul|ol|tbody|thead|tfoot|table)[^>]*>/gi, '\n');

  working = working
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>');

  working = working.replace(/<[^>]+>/g, ' ');

  return working
    .replace(/\r/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

interface ResolvedPageContent {
  readonly contentType: CompanyIntelPageInsert['contentType'];
  readonly promptContent: string;
  readonly markdownPayload: string | null;
  readonly htmlPayload: string | null;
  readonly wordCountSource: string | null;
}

function selectOptionalPayload(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  return value.trim().length > 0 ? value : null;
}

function extractMetadataDescription(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== 'object') {
    return null;
  }

  const record = metadata as Record<string, unknown>;
  const candidate = record.description ?? record.summary ?? record['og:description'];
  if (typeof candidate !== 'string') {
    return null;
  }

  const trimmed = candidate.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function resolvePageContent(document: SiteIntelScrapeExtractResult | null): ResolvedPageContent {
  const markdownContent = selectOptionalPayload(document?.markdown);
  const textContent = selectOptionalPayload(document?.text);
  const htmlPayload = selectOptionalPayload(document?.rawContent);
  const sanitizedHtml = htmlPayload ? stripHtml(htmlPayload) : null;

  const metaDescription = typeof document?.description === 'string'
    ? document.description.trim()
    : '';
  const trimmedMetaDescription = metaDescription.length > 0 ? metaDescription : null;

  const metadataDescription = extractMetadataDescription(document?.metadata);

  const promptCandidate = markdownContent
    ?? textContent
    ?? (sanitizedHtml && sanitizedHtml.length > 0 ? sanitizedHtml : null)
    ?? trimmedMetaDescription
    ?? metadataDescription
    ?? (htmlPayload ?? '');

  const promptContent = promptCandidate.trim();

  const contentType: CompanyIntelPageInsert['contentType'] =
    markdownContent || textContent ? 'markdown' : 'html';
  const markdownPayload = contentType === 'markdown'
    ? (markdownContent ?? textContent ?? null)
    : null;

  const wordCountSource = markdownPayload
    ?? textContent
    ?? sanitizedHtml
    ?? trimmedMetaDescription
    ?? metadataDescription
    ?? null;

  return {
    contentType,
    promptContent,
    markdownPayload,
    htmlPayload: contentType === 'html' ? htmlPayload : null,
    wordCountSource,
  };
}

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
      const resolvedContent = resolvePageContent(document);
      const scrapedAt = new Date();
      const metadata: Record<string, unknown> = document
        ? {
            ...document,
            ...(document.images ? { images: [...document.images] } : {}),
          }
        : { url: scrape.url };
      const pageRecord: CompanyIntelPageInsert = {
        url: scrape.url,
        contentType: resolvedContent.contentType,
        markdown: resolvedContent.markdownPayload,
        html: resolvedContent.htmlPayload,
        metadata,
        wordCount: getWordCount(
          resolvedContent.wordCountSource,
        ),
        scrapedAt,
        createdAt: scrapedAt,
      } satisfies CompanyIntelPageInsert;

      pageRecords.push(pageRecord);

      const pageContent = resolvedContent.promptContent;
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
