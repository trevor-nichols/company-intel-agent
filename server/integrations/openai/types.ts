// ------------------------------------------------------------------------------------------------
//                types.ts - Shared OpenAI integration types - Dependencies: openai
// ------------------------------------------------------------------------------------------------

import type { Logger } from '@agenai/logging';
import type OpenAI from 'openai';

export interface OpenAIClientConfig {
  readonly apiKey?: string;
  readonly baseUrl?: string;
  readonly organization?: string;
  readonly project?: string;
  readonly timeoutMs?: number;
  readonly maxRetries?: number;
  readonly defaultHeaders?: Record<string, string>;
  readonly logger?: Logger;
}

export interface ResolvedOpenAIClientConfig {
  readonly apiKey: string;
  readonly baseUrl: string | null;
  readonly organization: string | null;
  readonly project: string | null;
  readonly timeoutMs: number;
  readonly maxRetries: number;
}

export interface OpenAIClient {
  readonly client: OpenAI;
  readonly config: ResolvedOpenAIClientConfig;
}
