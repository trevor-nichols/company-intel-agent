import { logger as defaultLogger } from '../config/logging';
import type { CompanyIntelPersistence } from '../server/services/persistence';
import { buildChatSystemPrompt } from '../server/agents/chat/prompts';
import { validateChatRequestBody } from '../server/agents/chat/validation';
import { runChatAgent, type ChatAgentEvent } from '../server/agents/chat/client';
import {
  COMPANY_INTEL_CHAT_MAX_MESSAGES,
  type CompanyIntelChatStreamEvent,
} from '../shared/chat';
import type { OpenAIClientLike } from '../server/agents/shared/openai';
import type { ReasoningEffortLevel } from '../server/agents/shared/reasoning';
import { error, type HttpResult } from './http';

const encoder = new TextEncoder();

export interface ChatStreamDependencies {
  readonly persistence: CompanyIntelPersistence;
  readonly openAI: OpenAIClientLike;
  readonly chatModel: string;
  readonly chatReasoningEffort: ReasoningEffortLevel;
  readonly logger?: typeof defaultLogger;
}

export interface ChatStreamRequest {
  readonly snapshotId: number;
  readonly body: unknown;
}

export type ChatStreamResult =
  | { ok: true; stream: ReadableStream<Uint8Array> }
  | { ok: false; response: HttpResult };

interface ForwardChatEventOptions {
  readonly snapshotId: number;
  readonly sendEvent: (event: CompanyIntelChatStreamEvent) => void;
  readonly setResponseId: (responseId: string | null) => void;
  readonly getResponseId: () => string | null;
}

function forwardChatEvent(event: ChatAgentEvent, options: ForwardChatEventOptions): void {
  const responseId = event.responseId ?? options.getResponseId();

  switch (event.type) {
    case 'start': {
      options.setResponseId(event.responseId);
      options.sendEvent({
        type: 'chat-stream-start',
        snapshotId: options.snapshotId,
        responseId: event.responseId,
        model: event.model ?? null,
      });
      break;
    }
    case 'message-delta': {
      options.sendEvent({
        type: 'chat-message-delta',
        snapshotId: options.snapshotId,
        responseId,
        delta: event.delta,
      });
      break;
    }
    case 'message-complete': {
      options.sendEvent({
        type: 'chat-message-complete',
        snapshotId: options.snapshotId,
        responseId,
        message: event.message ?? null,
        citations: event.citations,
        consultedDocuments: event.consultedDocuments,
      });
      break;
    }
    case 'reasoning-delta': {
      options.sendEvent({
        type: 'chat-reasoning-delta',
        snapshotId: options.snapshotId,
        responseId,
        summaryIndex: event.summaryIndex,
        delta: event.delta,
      });
      break;
    }
    case 'reasoning-summary': {
      options.sendEvent({
        type: 'chat-reasoning-summary',
        snapshotId: options.snapshotId,
        responseId,
        summaryIndex: event.summaryIndex,
        text: event.text,
        headline: event.headline ?? null,
      });
      break;
    }
    case 'tool-status': {
      options.sendEvent({
        type: 'chat-tool-status',
        snapshotId: options.snapshotId,
        responseId,
        tool: event.tool,
        status: event.status,
      });
      break;
    }
    case 'usage': {
      options.sendEvent({
        type: 'chat-usage',
        snapshotId: options.snapshotId,
        responseId,
        usage: event.usage,
      });
      break;
    }
    case 'complete': {
      options.sendEvent({
        type: 'chat-complete',
        snapshotId: options.snapshotId,
        responseId,
      });
      break;
    }
    default:
      break;
  }
}

export async function createChatStream(
  request: ChatStreamRequest,
  dependencies: ChatStreamDependencies,
  options: { signal?: AbortSignal } = {},
): Promise<ChatStreamResult> {
  const log = dependencies.logger ?? defaultLogger;
  if (!Number.isFinite(request.snapshotId)) {
    return { ok: false, response: error('Invalid snapshot id', 400) };
  }

  const validation = validateChatRequestBody(request.body, COMPANY_INTEL_CHAT_MAX_MESSAGES);
  if (!validation.ok) {
    return {
      ok: false,
      response: {
        status: validation.status,
        body: { error: validation.message },
      },
    };
  }

  try {
    const snapshot = await dependencies.persistence.getSnapshotById(request.snapshotId);
    if (!snapshot) {
      return { ok: false, response: error('Snapshot not found', 404) };
    }

    if (!snapshot.vectorStoreId || snapshot.vectorStoreStatus !== 'ready') {
      return { ok: false, response: error('Snapshot knowledge base is not ready yet', 409) };
    }

    const systemPrompt = buildChatSystemPrompt({ domain: snapshot.domain ?? undefined });
    const chatStream = await runChatAgent(
      {
        vectorStoreId: snapshot.vectorStoreId,
        systemPrompt,
        messages: validation.messages,
        metadata: { snapshot_id: String(request.snapshotId) },
        reasoningEffort: dependencies.chatReasoningEffort,
      },
      {
        openAIClient: dependencies.openAI,
        model: dependencies.chatModel,
      },
    );
    const { events, abort } = chatStream;

    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        let isClosed = false;
        let responseId: string | null = null;

        const write = (payload: string, eventType?: string) => {
          try {
            controller.enqueue(encoder.encode(payload));
          } catch (err) {
            log.error('company-intel:chat-stream:write-failed', {
              snapshotId: request.snapshotId,
              responseId,
              eventType,
              error: err instanceof Error ? err.message : String(err),
            });
          }
        };

        const sendEvent = (event: CompanyIntelChatStreamEvent) => {
          const payload = {
            ...event,
            responseId: event.responseId ?? responseId,
          };
          write(`data: ${JSON.stringify(payload)}\n\n`, event.type);
        };

        const sendError = (message: string) => {
          sendEvent({
            type: 'chat-error',
            message,
            snapshotId: request.snapshotId,
            responseId,
          });
        };

        const sendDone = () => {
          write('data: [DONE]\n\n');
        };

        const close = () => {
          if (!isClosed) {
            isClosed = true;
            controller.close();
          }
        };

        const abortHandler = () => {
          abort();
          try {
            sendDone();
          } catch {
            // ignore
          }
          close();
        };

        options.signal?.addEventListener('abort', abortHandler, { once: true });

        (async () => {
          try {
            for await (const event of events) {
              forwardChatEvent(event, {
                snapshotId: request.snapshotId,
                sendEvent,
                setResponseId: value => {
                  responseId = value;
                },
                getResponseId: () => responseId,
              });
            }
          } catch (err) {
            const message = err instanceof Error ? err.message : 'Unable to complete chat stream';
            log.error('company-intel:chat-stream:error', {
              snapshotId: request.snapshotId,
              responseId,
              error: message,
            });
            sendError(message);
          } finally {
            try {
              sendDone();
            } catch {
              // ignore write failures on close
            }
            close();
            options.signal?.removeEventListener('abort', abortHandler);
          }
        })();
      },
      cancel() {
        abort();
      },
    });

    return { ok: true, stream };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unable to start chat stream';
    return { ok: false, response: error(message, 500) };
  }
}
