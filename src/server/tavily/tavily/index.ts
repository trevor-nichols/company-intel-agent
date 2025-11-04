// ------------------------------------------------------------------------------------------------
//                index.ts - Tavily integration exports - Dependencies: local client and types
// ------------------------------------------------------------------------------------------------

export { createTavilyClient, TavilyClientError } from './client';
export type { TavilyClientConfig } from './client';
export type {
  TavilyClient,
  TavilyExtractDepth,
  TavilyExtractFormat,
  TavilyExtractRequest,
  TavilyExtractResponse,
  TavilyExtractResult,
  TavilyFailedExtractResult,
  TavilyMapRequest,
  TavilyMapResponse,
} from './types';
