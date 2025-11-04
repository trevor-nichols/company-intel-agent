// ------------------------------------------------------------------------------------------------
//                openai.ts - Helper utilities for working with host-provided OpenAI clients
// ------------------------------------------------------------------------------------------------

import type OpenAI from 'openai';

export interface OpenAIResponsePayload {
  readonly id: string;
  readonly output?: unknown;
  readonly output_parsed?: unknown;
  readonly usage?: unknown;
}

export type OpenAIResponsesClient = OpenAI['responses'];

export type OpenAIClientLike =
  | { responses: OpenAIResponsesClient }
  | { client: OpenAI };

export function resolveOpenAIResponses(client: OpenAIClientLike): OpenAIResponsesClient {
  return 'responses' in client ? client.responses : client.client.responses;
}
