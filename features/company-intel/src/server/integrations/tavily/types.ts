// ------------------------------------------------------------------------------------------------
//                types.ts - Shared Tavily integration types - Dependencies: none
// ------------------------------------------------------------------------------------------------

// ------------------------------------------------------------------------------------------------
//                Map Endpoint Types
// ------------------------------------------------------------------------------------------------

export interface TavilyMapRequest {
  readonly url: string;
  readonly instructions?: string;
  readonly maxDepth?: number;
  readonly maxBreadth?: number;
  readonly limit?: number;
  readonly selectPaths?: readonly string[];
  readonly selectDomains?: readonly string[];
  readonly excludePaths?: readonly string[];
  readonly excludeDomains?: readonly string[];
  readonly allowExternal?: boolean;
}

export interface TavilyMapResponse {
  readonly baseUrl: string;
  readonly results: readonly string[];
  readonly responseTime?: number | null;
  readonly requestId?: string | null;
}

// ------------------------------------------------------------------------------------------------
//                Extract Endpoint Types
// ------------------------------------------------------------------------------------------------

export type TavilyExtractDepth = 'basic' | 'advanced';
export type TavilyExtractFormat = 'markdown' | 'text';

export interface TavilyExtractRequest {
  readonly urls: readonly string[];
  readonly includeImages?: boolean;
  readonly includeFavicon?: boolean;
  readonly extractDepth?: TavilyExtractDepth;
  readonly format?: TavilyExtractFormat;
  readonly timeout?: number;
}

export interface TavilyExtractResult {
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

export interface TavilyFailedExtractResult {
  readonly url: string;
  readonly error?: string;
  readonly status?: number;
  readonly reason?: string;
}

export interface TavilyExtractResponse {
  readonly results: readonly TavilyExtractResult[];
  readonly failedResults: readonly TavilyFailedExtractResult[];
  readonly responseTime?: number | null;
  readonly requestId?: string | null;
}

// ------------------------------------------------------------------------------------------------
//                Client Interface
// ------------------------------------------------------------------------------------------------

export interface TavilyClient {
  map(request: TavilyMapRequest): Promise<TavilyMapResponse>;
  extract(request: TavilyExtractRequest): Promise<TavilyExtractResponse>;
}
