// ------------------------------------------------------------------------------------------------
//                client.ts - Snapshot chat agent orchestrator
// ------------------------------------------------------------------------------------------------

import { logger as defaultLogger } from '@agenai/logging';
import type OpenAI from 'openai';
import type { ResponseCreateParams, ResponseStreamEvent } from 'openai/resources/responses/responses';

import type {
  CompanyIntelChatMessage,
  CompanyIntelChatCitation,
  CompanyIntelChatToolStatus,
  CompanyIntelConsultedDocument,
} from '@/shared/company-intel/chat';
import { extractChatCitations } from './citations';
import type { OpenAIClientLike } from '../shared/openai';
import { resolveOpenAIClient } from '../shared/openai';
import { extractResponseText, extractUsageMetadata } from '../shared/response';
import type { ReasoningEffortLevel } from '../shared/reasoning';

const DEFAULT_VECTOR_RESULTS = 6;

export interface RunChatAgentParams {
  readonly vectorStoreId: string;
  readonly systemPrompt: string;
  readonly messages: readonly CompanyIntelChatMessage[];
  readonly reasoningEffort?: ReasoningEffortLevel;
  readonly maxVectorResults?: number;
  readonly metadata?: Record<string, string>;
}

export interface RunChatAgentDependencies {
  readonly openAIClient: OpenAIClientLike;
  readonly model: string;
  readonly logger?: typeof defaultLogger;
}

export interface ChatAgentStream {
  readonly events: AsyncIterable<ChatAgentEvent>;
  abort: () => void;
}

interface ChatAgentEventBase {
  readonly responseId?: string;
}

export type ChatAgentEvent =
  | ({ readonly type: 'start'; readonly responseId: string; readonly model?: string | null } & ChatAgentEventBase)
  | ({ readonly type: 'message-delta'; readonly delta: string } & ChatAgentEventBase)
  | ({ readonly type: 'reasoning-delta'; readonly summaryIndex: number; readonly delta: string } & ChatAgentEventBase)
  | ({ readonly type: 'reasoning-summary'; readonly summaryIndex: number; readonly text: string; readonly headline: string | null } & ChatAgentEventBase)
  | ({ readonly type: 'tool-status'; readonly tool: string; readonly status: CompanyIntelChatToolStatus } & ChatAgentEventBase)
  | ({ readonly type: 'message-complete'; readonly responseId: string; readonly message: string | null; readonly citations?: readonly CompanyIntelChatCitation[]; readonly consultedDocuments?: readonly CompanyIntelConsultedDocument[] } & ChatAgentEventBase)
  | ({ readonly type: 'usage'; readonly usage?: Record<string, unknown> | null } & ChatAgentEventBase)
  | ({ readonly type: 'complete' } & ChatAgentEventBase);

export async function runChatAgent(
  params: RunChatAgentParams,
  dependencies: RunChatAgentDependencies,
): Promise<ChatAgentStream> {
  const log = dependencies.logger ?? defaultLogger;
  if (!params.systemPrompt || params.systemPrompt.trim().length === 0) {
    throw new Error('Chat agent requires a system prompt.');
  }

  if (!params.vectorStoreId) {
    throw new Error('Chat agent requires a vectorStoreId.');
  }

  const openAI = resolveOpenAIClient(dependencies.openAIClient);
  const reasoningEffort: ReasoningEffortLevel = params.reasoningEffort ?? 'low';
  const input: ResponseCreateParams['input'] = buildInput(params.systemPrompt, params.messages);

  const requestPayload: ResponseCreateParams = {
    model: dependencies.model,
    input,
    reasoning: { effort: reasoningEffort, summary: 'auto' },
    include: ['file_search_call.results'],
    tools: [
      {
        type: 'file_search',
        vector_store_ids: [params.vectorStoreId],
        max_num_results: params.maxVectorResults ?? DEFAULT_VECTOR_RESULTS,
      },
    ],
    metadata: params.metadata,
  };

  const modelStream = await openAI.responses.stream({
    ...requestPayload,
    stream: true,
  });

  return {
    events: buildStreamIterator(modelStream, log),
    abort: () => {
      try {
        modelStream.abort();
      } catch (error) {
        log.warn('company-intel:chat-agent:abort-error', {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    },
  } satisfies ChatAgentStream;
}

function buildInput(
  systemPrompt: string,
  messages: readonly CompanyIntelChatMessage[],
): ResponseCreateParams['input'] {
  const normalizedMessages = messages.map((message) => ({
    role: message.role,
    content: message.content,
  }));

  return [
    { role: 'system', content: systemPrompt },
    ...normalizedMessages,
  ];
}

type ResponsesStream = Awaited<ReturnType<OpenAI['responses']['stream']>>;

function buildStreamIterator(
  modelStream: ResponsesStream,
  log: typeof defaultLogger,
): AsyncIterable<ChatAgentEvent> {
  return {
    async *[Symbol.asyncIterator]() {
      const summaryBuffers = new Map<number, string>();
      let latestResponseId: string | null = null;

      try {
        for await (const event of modelStream as AsyncIterable<ResponseStreamEvent>) {
          switch (event.type) {
            case 'response.created': {
              const response = event.response as { id?: string; model?: string | null } | undefined;
              const responseId = response?.id;
              if (responseId) {
                latestResponseId = responseId;
                yield {
                  type: 'start',
                  responseId,
                  model: response?.model,
                } satisfies ChatAgentEvent;
              }
              break;
            }
            case 'response.output_text.delta': {
              const delta = typeof event.delta === 'string' ? event.delta : undefined;
              if (delta && delta.length > 0) {
                yield {
                  type: 'message-delta',
                  delta,
                } satisfies ChatAgentEvent;
              }
              break;
            }
            case 'response.reasoning_summary_text.delta': {
              const summaryIndex = typeof event.summary_index === 'number' ? event.summary_index : 0;
              const delta = typeof event.delta === 'string' ? event.delta : undefined;
              if (delta && delta.length > 0) {
                const existing = summaryBuffers.get(summaryIndex) ?? '';
                summaryBuffers.set(summaryIndex, `${existing}${delta}`);
                yield {
                  type: 'reasoning-delta',
                  summaryIndex,
                  delta,
                } satisfies ChatAgentEvent;
              }
              break;
            }
            case 'response.reasoning_summary_text.done': {
              const summaryIndex = typeof event.summary_index === 'number' ? event.summary_index : 0;
              const text = typeof event.text === 'string' ? event.text : summaryBuffers.get(summaryIndex) ?? '';
              summaryBuffers.set(summaryIndex, text);
              yield {
                type: 'reasoning-summary',
                summaryIndex,
                text,
                headline: deriveHeadline(text),
              } satisfies ChatAgentEvent;
              break;
            }
            case 'response.file_search_call.in_progress': {
              yield {
                type: 'tool-status',
                tool: 'file_search',
                status: 'in_progress',
              } satisfies ChatAgentEvent;
              break;
            }
            case 'response.file_search_call.searching': {
              yield {
                type: 'tool-status',
                tool: 'file_search',
                status: 'searching',
              } satisfies ChatAgentEvent;
              break;
            }
            case 'response.file_search_call.completed': {
              yield {
                type: 'tool-status',
                tool: 'file_search',
                status: 'completed',
              } satisfies ChatAgentEvent;
              break;
            }
            case 'response.completed': {
              const response = event.response;
              const responseId = (response as { id?: string })?.id ?? latestResponseId;
              if (!response || !responseId) {
                throw new Error('Chat response completed without a response id.');
              }

              const message = extractResponseText(response);
              const citationPayload = extractChatCitations(response);
              const usage = extractUsageMetadata(response);

              yield {
                type: 'message-complete',
                responseId,
                message,
                citations: citationPayload?.inlineCitations,
                consultedDocuments: citationPayload?.consultedDocuments,
              } satisfies ChatAgentEvent;

              yield {
                type: 'usage',
                responseId,
                usage,
              } satisfies ChatAgentEvent;

              yield {
                type: 'complete',
                responseId,
              } satisfies ChatAgentEvent;
              break;
            }
            case 'response.failed': {
              const message = (event.response as { error?: { message?: string } } | undefined)?.error?.message ??
                'Model failed to complete the chat response';
              throw new Error(message);
            }
            case 'response.incomplete': {
              throw new Error('Chat response ended before completion');
            }
            case 'error': {
              const message = typeof event.message === 'string' ? event.message : 'Model returned an error';
              throw new Error(message);
            }
            default:
              // ignore other event types
              break;
          }
        }
      } catch (error) {
        log.error('company-intel:chat-agent:stream-failure', {
          error: error instanceof Error ? error.message : String(error),
        });
        throw error instanceof Error ? error : new Error('Unable to complete chat stream');
      }
    },
  } satisfies AsyncIterable<ChatAgentEvent>;
}

function deriveHeadline(text: string | null | undefined): string | null {
  if (!text) {
    return null;
  }
  const trimmed = text.trim();
  if (!trimmed) {
    return null;
  }
  const [firstLineRaw] = trimmed.split('\n');
  if (!firstLineRaw) {
    return null;
  }
  const maybeBold = firstLineRaw.trim();
  const boldMatch = maybeBold.match(/^\*\*(.+?)\*\*$/);
  const normalizedLine = boldMatch ? boldMatch[1] : firstLineRaw;
  const cleaned = normalizedLine.replace(/^[#*\s-]+/, '').replace(/\*\*$/g, '').trim();
  return cleaned.length > 0 ? cleaned : null;
}

export { DEFAULT_VECTOR_RESULTS };
