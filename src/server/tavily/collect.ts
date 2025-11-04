// ------------------------------------------------------------------------------------------------
//                collectSiteIntel.ts - Company intel orchestrator - Dependencies: Tavily client, selectors
// ------------------------------------------------------------------------------------------------

// ------------------------------------------------------------------------------------------------
//                Orchestration Logic
// ------------------------------------------------------------------------------------------------

import { logger as defaultLogger } from '@agenai/logging';

import { rankMapLinks } from './selectors';
import type {
  CollectSiteIntelOptions,
  SiteIntelMap,
  SiteIntelMapLink,
  SiteIntelResult,
  SiteIntelScrapeOutcome,
  SiteIntelScrapeResponse,
  SiteIntelSelection,
  TavilyClient,
  TavilyExtractResponse,
  TavilyMapResponse,
} from './types';

const DEFAULT_MAX_PAGES = 10;
const DEFAULT_EXTRACT_DEPTH: CollectSiteIntelOptions['extractDepth'] = 'basic';
const DEFAULT_EXTRACT_FORMAT: CollectSiteIntelOptions['extractFormat'] = 'markdown';
const DEFAULT_INCLUDE_IMAGES = false;
const DEFAULT_INCLUDE_FAVICON = true;

const RATE_LIMIT_MAX_ATTEMPTS = 4;
const RATE_LIMIT_BASE_DELAY_MS = 2_000;
const RATE_LIMIT_MAX_DELAY_MS = 60_000;

export interface CollectSiteIntelDependencies {
  readonly tavily: TavilyClient;
  readonly logger?: typeof defaultLogger;
}

function normaliseDomain(domain: string): string {
  const trimmed = domain.trim();
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

function sleep(durationMs: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, durationMs));
}

function parseRetryAfterMs(detail: unknown): number | null {
  if (!detail) return null;

  const message =
    typeof detail === 'string'
      ? detail
      : typeof detail === 'object'
        ? typeof (detail as { error?: unknown }).error === 'string'
          ? (detail as { error: string }).error
          : JSON.stringify(detail)
        : null;

  if (!message) return null;

  const secondsMatch = message.match(/retry after\s+(?<seconds>\d+(?:\.\d+)?)/i);
  if (secondsMatch?.groups?.seconds) {
    const parsed = Number.parseFloat(secondsMatch.groups.seconds);
    if (!Number.isNaN(parsed) && parsed > 0) {
      return Math.round(parsed * 1_000);
    }
  }

  return null;
}

function getErrorDetail(error: unknown): unknown {
  if (error && typeof error === 'object' && 'detail' in error) {
    return (error as { detail?: unknown }).detail;
  }
  return null;
}

async function withRateLimitRetry<T>(
  operation: () => Promise<T>,
  meta: Record<string, unknown>,
  log: typeof defaultLogger,
): Promise<T> {
  let attempt = 0;
  let lastError: unknown;

  while (attempt <= RATE_LIMIT_MAX_ATTEMPTS) {
    try {
      return await operation();
    } catch (error) {
      const status = typeof (error as { status?: number }).status === 'number'
        ? (error as { status: number }).status
        : null;

      if (status === 429) {
        const retryDelayMs = Math.min(
          parseRetryAfterMs(getErrorDetail(error)) ?? RATE_LIMIT_BASE_DELAY_MS * Math.max(1, attempt + 1),
          RATE_LIMIT_MAX_DELAY_MS,
        );

        log.warn('tavily:rate-limit', {
          ...meta,
          attempt,
          retryDelayMs,
        });

        attempt += 1;
        lastError = error;
        await sleep(retryDelayMs);
        continue;
      }

      throw error instanceof Error ? error : new Error('Tavily request failed');
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error('Tavily rate limit retry exhausted');
}

function ensureAbsoluteUrl(candidate: string, baseOrigin: string): URL | null {
  if (!candidate) return null;

  try {
    if (/^https?:\/\//i.test(candidate)) {
      return new URL(candidate);
    }
    return new URL(candidate, baseOrigin);
  } catch {
    return null;
  }
}

function normalizeHost(hostname: string): string {
  return hostname.replace(/^www\./i, '').toLowerCase();
}

function normalizeSelectionUrl(
  candidate: string,
  baseOrigin: string,
  baseHost: string,
  includeSubdomains: boolean,
  ignoreQueryParameters: boolean,
): string | null {
  const resolved = ensureAbsoluteUrl(candidate, baseOrigin);
  if (!resolved) {
    return null;
  }

  const candidateHost = normalizeHost(resolved.hostname);
  const hostMatches =
    candidateHost === baseHost || (includeSubdomains && candidateHost.endsWith(`.${baseHost}`));

  if (!hostMatches) {
    return null;
  }

  if (ignoreQueryParameters) {
    resolved.search = '';
    resolved.hash = '';
  }

  return resolved.toString();
}

function buildMapLinks(
  raw: TavilyMapResponse,
  baseOrigin: string,
  ignoreQueryParameters: boolean,
): SiteIntelMapLink[] {
  const seen = new Set<string>();
  const links: SiteIntelMapLink[] = [];

  for (const candidate of raw.results) {
    const resolved = ensureAbsoluteUrl(candidate, baseOrigin);
    if (!resolved) {
      continue;
    }

    if (ignoreQueryParameters) {
      resolved.search = '';
      resolved.hash = '';
    }

    const normalized = resolved.toString();
    if (seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    links.push({ url: normalized });
  }

  return links;
}

function toSiteIntelMap(
  domain: string,
  raw: TavilyMapResponse,
  ignoreQueryParameters: boolean,
): SiteIntelMap {
  const resolvedDomain = new URL(domain);
  const baseOrigin = resolvedDomain.origin;
  const baseUrlCandidate = raw.baseUrl?.trim();
  const baseUrl = baseUrlCandidate
    ? ensureAbsoluteUrl(baseUrlCandidate, baseOrigin)?.origin ?? resolvedDomain.origin
    : resolvedDomain.origin;

  return {
    baseUrl,
    links: buildMapLinks(raw, baseOrigin, ignoreQueryParameters),
    responseTime: raw.responseTime ?? null,
    requestId: raw.requestId ?? null,
  } satisfies SiteIntelMap;
}

function toSiteIntelScrapeResponse(
  response: TavilyExtractResponse,
): SiteIntelScrapeResponse {
  return {
    results: response.results.map(result => ({
      url: result.url,
      rawContent: result.rawContent,
      markdown: result.markdown,
      text: result.text,
      images: result.images,
      favicon: result.favicon ?? null,
      title: result.title,
      description: result.description,
      metadata: result.metadata ?? null,
    })),
    failedResults: response.failedResults,
    requestId: response.requestId ?? null,
    responseTime: response.responseTime ?? null,
  } satisfies SiteIntelScrapeResponse;
}

function selectPrimaryDocument(
  scrape: SiteIntelScrapeResponse,
  targetUrl: string,
): SiteIntelScrapeResponse['results'][number] | undefined {
  return scrape.results.find(result => result.url === targetUrl) ?? scrape.results[0];
}

async function performSiteIntel(
  domain: string,
  options: CollectSiteIntelOptions = {},
  dependencies: CollectSiteIntelDependencies,
  flags: { previewOnly?: boolean } = {},
): Promise<SiteIntelResult> {
  const log = dependencies.logger ?? defaultLogger;
  const tavily = dependencies.tavily;
  if (!tavily) {
    throw new Error('Tavily client is required to collect site intel.');
  }

  const resolvedDomain = normaliseDomain(domain);
  const maxPages = options.maxPages ?? DEFAULT_MAX_PAGES;
  const includeSubdomains = options.includeSubdomains ?? true;
  const ignoreQueryParameters = options.ignoreQueryParameters ?? true;
  const includeImages = options.includeImages ?? DEFAULT_INCLUDE_IMAGES;
  const includeFavicon = options.includeFavicon ?? DEFAULT_INCLUDE_FAVICON;
  const extractDepth = options.extractDepth ?? DEFAULT_EXTRACT_DEPTH;
  const extractFormat = options.extractFormat ?? DEFAULT_EXTRACT_FORMAT;
  const selectedUrlsInput = options.selectedUrls ?? [];

  const baseUrlObject = new URL(resolvedDomain);
  const baseOrigin = baseUrlObject.origin;
  const baseHost = normalizeHost(baseUrlObject.hostname);

  log.info('site-intel:map:start', {
    domain: resolvedDomain,
    maxPages,
    includeSubdomains,
    ignoreQueryParameters,
  });

  const rawMap = await withRateLimitRetry(
    () =>
      tavily.map({
        url: resolvedDomain,
        limit: Math.max(maxPages * 10, 25),
        allowExternal: includeSubdomains,
      }),
    {
      domain: resolvedDomain,
      operation: 'map',
    },
    log,
  );

  const map = toSiteIntelMap(resolvedDomain, rawMap, ignoreQueryParameters);

  log.info('site-intel:map:success', {
    domain: resolvedDomain,
    totalLinks: map.links.length,
  });

  const suggestedSelections: SiteIntelSelection[] = rankMapLinks(
    resolvedDomain,
    map.links,
    maxPages,
    includeSubdomains,
  );

  log.info('site-intel:selection', {
    domain: resolvedDomain,
    selections: suggestedSelections,
  });

  const normalizedSelectedUrls = Array.from(
    new Set(
      selectedUrlsInput
        .map(url =>
          normalizeSelectionUrl(url, baseOrigin, baseHost, includeSubdomains, ignoreQueryParameters),
        )
        .filter((value): value is string => Boolean(value)),
    ),
  );

  const suggestionsByUrl = new Map<string, SiteIntelSelection>(
    suggestedSelections.map(selection => [selection.url, selection]),
  );

  const selections: SiteIntelSelection[] =
    normalizedSelectedUrls.length > 0
      ? normalizedSelectedUrls.map(url =>
          suggestionsByUrl.get(url) ?? {
            url,
            score: 1,
            matchedSignals: ['user-selected'],
          },
        )
      : suggestedSelections;

  if (flags.previewOnly) {
    return {
      domain: resolvedDomain,
      map,
      selections: selections.slice(0, Math.max(1, maxPages)),
      scrapes: [],
    } satisfies SiteIntelResult;
  }

  const scrapes: SiteIntelScrapeOutcome[] = [];

  for (const selection of selections) {
    const start = Date.now();
    log.info('site-intel:extract:start', {
      url: selection.url,
      extractDepth,
      extractFormat,
      includeImages,
      includeFavicon,
    });

    try {
      const response = await withRateLimitRetry(
        () =>
          tavily.extract({
            urls: [selection.url],
            includeImages,
            includeFavicon,
            extractDepth,
            format: extractFormat,
          }),
        {
          url: selection.url,
          operation: 'extract',
        },
        log,
      );

      const durationMs = Date.now() - start;
      const siteResponse = toSiteIntelScrapeResponse(response);

      scrapes.push({
        url: selection.url,
        success: true,
        response: siteResponse,
        durationMs,
      });

      const primary = selectPrimaryDocument(siteResponse, selection.url);

      log.info('site-intel:extract:success', {
        url: selection.url,
        durationMs,
        hasMarkdown: Boolean(primary?.markdown ?? primary?.rawContent ?? primary?.text),
        imageCount: primary?.images?.length ?? 0,
      });
    } catch (error) {
      const durationMs = Date.now() - start;
      scrapes.push({
        url: selection.url,
        success: false,
        error: error as Error,
        durationMs,
      });
      log.error('site-intel:extract:error', {
        url: selection.url,
        durationMs,
        error: error instanceof Error ? { name: error.name, message: error.message } : error ?? null,
      });
    }
  }

  return {
    domain: resolvedDomain,
    map,
    selections,
    scrapes,
  } satisfies SiteIntelResult;
}

export async function collectSiteIntel(
  domain: string,
  options: CollectSiteIntelOptions = {},
  dependencies: CollectSiteIntelDependencies,
): Promise<SiteIntelResult> {
  return performSiteIntel(domain, options, dependencies, { previewOnly: false });
}

export async function previewSiteIntel(
  domain: string,
  options: CollectSiteIntelOptions = {},
  dependencies: CollectSiteIntelDependencies,
): Promise<SiteIntelResult> {
  return performSiteIntel(domain, options, dependencies, { previewOnly: true });
}
