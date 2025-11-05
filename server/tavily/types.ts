// ------------------------------------------------------------------------------------------------
//                types.ts - Company intel orchestration types (Tavily)
// ------------------------------------------------------------------------------------------------

import type { TavilyExtractDepth, TavilyExtractFormat } from '../integrations/tavily/types';

export type {
  TavilyMapRequest,
  TavilyMapResponse,
  TavilyExtractDepth,
  TavilyExtractFormat,
  TavilyExtractRequest,
  TavilyExtractResult,
  TavilyFailedExtractResult,
  TavilyExtractResponse,
  TavilyClient,
} from '../integrations/tavily/types';

export interface SiteIntelSelection {
  readonly url: string;
  readonly score: number;
  readonly matchedSignals: readonly string[];
}

export interface SiteIntelMapLink {
  readonly url: string;
  readonly title?: string;
  readonly description?: string;
}

export interface SiteIntelMap {
  readonly baseUrl: string;
  readonly links: readonly SiteIntelMapLink[];
  readonly responseTime?: number | null;
  readonly requestId?: string | null;
}

export interface SiteIntelScrapeExtractResult {
  readonly url: string;
  readonly rawContent?: string;
  readonly markdown?: string;
  readonly text?: string;
  readonly images?: readonly string[];
  readonly favicon?: string | null;
  readonly title?: string;
  readonly description?: string;
  readonly metadata?: Record<string, unknown> | null;
}

export interface SiteIntelScrapeFailedResult {
  readonly url: string;
  readonly error?: string;
  readonly status?: number;
  readonly reason?: string;
}

export interface SiteIntelScrapeResponse {
  readonly results: readonly SiteIntelScrapeExtractResult[];
  readonly failedResults: readonly SiteIntelScrapeFailedResult[];
  readonly requestId?: string | null;
  readonly responseTime?: number | null;
}

export interface SiteIntelScrapeOutcome {
  readonly url: string;
  readonly success: boolean;
  readonly response?: SiteIntelScrapeResponse;
  readonly error?: Error;
  readonly durationMs: number;
}

export interface SiteIntelResult {
  readonly domain: string;
  readonly map: SiteIntelMap;
  readonly selections: readonly SiteIntelSelection[];
  readonly scrapes: readonly SiteIntelScrapeOutcome[];
}

export interface CollectSiteIntelOptions {
  readonly maxPages?: number;
  readonly includeSubdomains?: boolean;
  readonly ignoreQueryParameters?: boolean;
  readonly includeImages?: boolean;
  readonly includeFavicon?: boolean;
  readonly extractDepth?: TavilyExtractDepth;
  readonly extractFormat?: TavilyExtractFormat;
  readonly selectedUrls?: readonly string[];
}
