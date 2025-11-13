// ------------------------------------------------------------------------------------------------
//                openai.ts - Helper utilities for working with host-provided OpenAI clients
// ------------------------------------------------------------------------------------------------

import type OpenAI from 'openai';

export type OpenAIResponsesClient = OpenAI['responses'];

export type OpenAIClientLike =
  | OpenAI
  | { responses: OpenAIResponsesClient }
  | { client: OpenAI };

export function resolveOpenAIResponses(client: OpenAIClientLike): OpenAIResponsesClient {
  if (client instanceof Object && 'responses' in client) {
    return (client as { responses: OpenAIResponsesClient }).responses;
  }
  const root = resolveOpenAIClient(client);
  return root.responses;
}

export function resolveOpenAIClient(client: OpenAIClientLike): OpenAI {
  if (isOpenAIInstance(client)) {
    return client;
  }

  if (client && typeof client === 'object' && 'client' in client) {
    const nested = (client as { client?: OpenAI }).client;
    if (nested) {
      return nested;
    }
  }
  throw new Error('OpenAI client with root access is required for this operation.');
}

function isOpenAIInstance(candidate: unknown): candidate is OpenAI {
  if (!candidate || typeof candidate !== 'object') {
    return false;
  }

  const record = candidate as Partial<OpenAI> & {
    vectorStores?: { create?: unknown };
  };

  const hasResponses = typeof record.responses?.create === 'function';
  const hasVectorStores = typeof record.vectorStores?.create === 'function';

  return Boolean(hasResponses && hasVectorStores);
}
