// ------------------------------------------------------------------------------------------------
//                openai.ts - Helper utilities for working with host-provided OpenAI clients
// ------------------------------------------------------------------------------------------------

export interface OpenAIResponsePayload {
  readonly id: string;
  readonly output?: unknown;
  readonly output_parsed?: unknown;
  readonly usage?: unknown;
}

export interface OpenAIResponsesStream {
  on(event: string, listener: (event: any) => void): OpenAIResponsesStream;
  off?(event: string, listener: (event: any) => void): OpenAIResponsesStream;
  once?(event: string, listener: (event: any) => void): OpenAIResponsesStream;
  abort(): void;
  finalResponse(): Promise<OpenAIResponsePayload>;
}

export interface OpenAIResponsesClient {
  // The OpenAI SDK has a rich signature; we accept any args and rely on runtime behaviour.
  parse: (...args: any[]) => Promise<OpenAIResponsePayload>;
  stream?: (...args: any[]) => OpenAIResponsesStream;
}

export type OpenAIClientLike =
  | { responses: OpenAIResponsesClient }
  | { client: { responses: OpenAIResponsesClient } };

export function resolveOpenAIResponses(client: OpenAIClientLike): OpenAIResponsesClient {
  return 'responses' in client ? client.responses : client.client.responses;
}
