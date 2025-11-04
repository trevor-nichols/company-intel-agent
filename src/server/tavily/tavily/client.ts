// ------------------------------------------------------------------------------------------------
//                client.ts - Tavily HTTP client - Dependencies: @agenai/config, @agenai/logging
// ------------------------------------------------------------------------------------------------

// ------------------------------------------------------------------------------------------------
//                Client Factory
// ------------------------------------------------------------------------------------------------

import { requireEnvVar } from '@agenai/config';
import { logger as defaultLogger } from '@agenai/logging';

import type {
  TavilyClient,
  TavilyExtractRequest,
  TavilyExtractResponse,
  TavilyMapRequest,
  TavilyMapResponse,
} from './types';

const DEFAULT_BASE_URL = 'https://api.tavily.com';

export interface TavilyClientConfig {
  readonly apiKey?: string;
  readonly baseUrl?: string;
  readonly fetchImplementation?: typeof fetch;
  readonly logger?: typeof defaultLogger;
}

export class TavilyClientError extends Error {
  readonly status: number;
  readonly detail: unknown;

  constructor(message: string, status: number, detail: unknown) {
    super(message);
    this.name = 'TavilyClientError';
    this.status = status;
    this.detail = detail;
  }
}

interface RawTavilyMapResponse {
  readonly base_url?: unknown;
  readonly results?: unknown;
  readonly response_time?: unknown;
  readonly request_id?: unknown;
}

interface RawTavilyExtractResult {
  readonly url?: unknown;
  readonly raw_content?: unknown;
  readonly markdown?: unknown;
  readonly text?: unknown;
  readonly images?: unknown;
  readonly favicon?: unknown;
  readonly title?: unknown;
  readonly description?: unknown;
  readonly metadata?: unknown;
}

interface RawTavilyFailedResult {
  readonly url?: unknown;
  readonly error?: unknown;
  readonly status?: unknown;
  readonly reason?: unknown;
}

interface RawTavilyExtractResponse {
  readonly results?: unknown;
  readonly failed_results?: unknown;
  readonly response_time?: unknown;
  readonly request_id?: unknown;
}

function sanitizePayload<T extends Record<string, unknown>>(payload: T): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== undefined && value !== null),
  );
}

function normalizeMapResponse(payload: RawTavilyMapResponse): TavilyMapResponse {
  const results = Array.isArray(payload.results)
    ? payload.results.filter((value): value is string => typeof value === 'string')
    : [];

  return {
    baseUrl: typeof payload.base_url === 'string' ? payload.base_url : '',
    results,
    responseTime: typeof payload.response_time === 'number' ? payload.response_time : null,
    requestId: typeof payload.request_id === 'string' ? payload.request_id : null,
  } satisfies TavilyMapResponse;
}

function normalizeExtractResponse(payload: RawTavilyExtractResponse): TavilyExtractResponse {
  const results = Array.isArray(payload.results)
    ? payload.results
        .filter((item): item is RawTavilyExtractResult => typeof item === 'object' && item !== null)
        .map(result => {
          const images = Array.isArray(result.images)
            ? result.images.filter((value): value is string => typeof value === 'string')
            : undefined;

          const metadata =
            result.metadata && typeof result.metadata === 'object' && !Array.isArray(result.metadata)
              ? (result.metadata as Record<string, unknown>)
              : null;

          return {
            url: typeof result.url === 'string' ? result.url : '',
            rawContent: typeof result.raw_content === 'string' ? result.raw_content : undefined,
            markdown: typeof result.markdown === 'string' ? result.markdown : undefined,
            text: typeof result.text === 'string' ? result.text : undefined,
            images,
            favicon: typeof result.favicon === 'string' ? result.favicon : null,
            title: typeof result.title === 'string' ? result.title : undefined,
            description: typeof result.description === 'string' ? result.description : undefined,
            metadata,
          };
        })
    : [];

  const failedResults = Array.isArray(payload.failed_results)
    ? payload.failed_results
        .filter((item): item is RawTavilyFailedResult => typeof item === 'object' && item !== null)
        .map(result => ({
          url: typeof result.url === 'string' ? result.url : '',
          error: typeof result.error === 'string' ? result.error : undefined,
          status: typeof result.status === 'number' ? result.status : undefined,
          reason: typeof result.reason === 'string' ? result.reason : undefined,
        }))
    : [];

  return {
    results,
    failedResults,
    responseTime: typeof payload.response_time === 'number' ? payload.response_time : null,
    requestId: typeof payload.request_id === 'string' ? payload.request_id : null,
  } satisfies TavilyExtractResponse;
}

export function createTavilyClient(config: TavilyClientConfig = {}): TavilyClient {
  const apiKey = config.apiKey ?? requireEnvVar('TAVILY_API_KEY');
  const baseUrl = (config.baseUrl ?? DEFAULT_BASE_URL).replace(/\/?$/, '');
  const fetchImplementation = config.fetchImplementation ?? fetch;
  const log = config.logger ?? defaultLogger;

  async function post<ResponseBody>(path: string, body: Record<string, unknown>): Promise<ResponseBody> {
    const target = `${baseUrl}${path}`;
    const payload = sanitizePayload(body);

    log.debug('tavily:request:start', {
      path,
      url: target,
      payloadKeys: Object.keys(payload),
    });

    let response: Response;
    try {
      response = await fetchImplementation(target, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
    } catch (error) {
      log.error('tavily:request:error', {
        path,
        url: target,
        error: error instanceof Error ? { name: error.name, message: error.message } : error ?? null,
      });
      throw new TavilyClientError('Failed to reach Tavily API', 0, error);
    }

    const text = await response.text();
    let json: unknown;
    if (text.length > 0) {
      try {
        json = JSON.parse(text);
      } catch (error) {
        log.error('tavily:response:parse-error', {
          path,
          status: response.status,
          textSnippet: text.slice(0, 512),
          error: error instanceof Error ? { name: error.name, message: error.message } : error ?? null,
        });
        throw new TavilyClientError('Failed to parse Tavily response', response.status, text);
      }
    }

    if (!response.ok) {
      log.error('tavily:response:http-error', {
        path,
        status: response.status,
        payload: json,
      });
      throw new TavilyClientError('Tavily request failed', response.status, json);
    }

    log.debug('tavily:response:success', {
      path,
      status: response.status,
    });

    return json as ResponseBody;
  }

  async function map(request: TavilyMapRequest): Promise<TavilyMapResponse> {
    const raw = await post<RawTavilyMapResponse>('/map', {
      url: request.url,
      instructions: request.instructions,
      max_depth: request.maxDepth,
      max_breadth: request.maxBreadth,
      limit: request.limit,
      select_paths: request.selectPaths ? [...request.selectPaths] : undefined,
      select_domains: request.selectDomains ? [...request.selectDomains] : undefined,
      exclude_paths: request.excludePaths ? [...request.excludePaths] : undefined,
      exclude_domains: request.excludeDomains ? [...request.excludeDomains] : undefined,
      allow_external: request.allowExternal,
    });

    return normalizeMapResponse(raw);
  }

  async function extract(request: TavilyExtractRequest): Promise<TavilyExtractResponse> {
    const urls = request.urls.map(url => url);
    if (urls.length === 0) {
      throw new TavilyClientError('At least one URL must be provided to Tavily extract', 400, {
        urls,
      });
    }

    const raw = await post<RawTavilyExtractResponse>('/extract', {
      urls,
      include_images: request.includeImages,
      include_favicon: request.includeFavicon,
      extract_depth: request.extractDepth,
      format: request.format,
      timeout: request.timeout,
    });

    return normalizeExtractResponse(raw);
  }

  return {
    map,
    extract,
  } satisfies TavilyClient;
}
