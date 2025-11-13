import { NextRequest } from 'next/server';
import { logger } from '@agenai/logging';

import { getCompanyIntelEnvironment } from '@/server/bootstrap';
import { validateChatRequestBody } from '@/server/agents/chat/validation';
import { buildChatSystemPrompt } from '@/server/agents/chat/prompts';
import { runChatAgent, type ChatAgentEvent } from '@/server/agents/chat/client';
import {
  COMPANY_INTEL_CHAT_MAX_MESSAGES,
  type CompanyIntelChatStreamEvent,
} from '@/shared/company-intel/chat';

export const runtime = 'nodejs';

const SSE_HEADERS = {
  'Content-Type': 'text/event-stream',
  'Cache-Control': 'no-cache, no-transform',
  Connection: 'keep-alive',
  'X-Accel-Buffering': 'no',
};

const encoder = new TextEncoder();

export async function POST(request: NextRequest, context: { params: { id: string } }) {
  const snapshotId = Number.parseInt(context.params.id, 10);
  if (!Number.isFinite(snapshotId)) {
    return new Response(JSON.stringify({ error: 'Invalid snapshot id' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const body = await request.json().catch(() => null);
  const validation = validateChatRequestBody(body, COMPANY_INTEL_CHAT_MAX_MESSAGES);
  if (!validation.ok) {
    return new Response(JSON.stringify({ error: validation.message }), {
      status: validation.status,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const { persistence, openAI, chatModel } = getCompanyIntelEnvironment();
    const snapshot = await persistence.getSnapshotById(snapshotId);
    if (!snapshot) {
      return new Response(JSON.stringify({ error: 'Snapshot not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!snapshot.vectorStoreId || snapshot.vectorStoreStatus !== 'ready') {
      return new Response(JSON.stringify({ error: 'Snapshot knowledge base is not ready yet' }), {
        status: 409,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const systemPrompt = buildChatSystemPrompt({ domain: snapshot.domain ?? undefined });
    const chatExecution = await runChatAgent(
      {
        vectorStoreId: snapshot.vectorStoreId,
        systemPrompt,
        messages: validation.messages,
        metadata: { snapshot_id: String(snapshotId) },
        mode: 'stream',
      },
      {
        openAIClient: openAI,
        model: chatModel,
      },
    );

    if (chatExecution.mode !== 'stream') {
      throw new Error('Chat agent returned unexpected blocking mode.');
    }

    const { events, abort } = chatExecution.stream;

    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        let isClosed = false;
        let responseId: string | null = null;

        const write = (payload: string, eventType?: string) => {
          try {
            controller.enqueue(encoder.encode(payload));
          } catch (error) {
            logger.error('company-intel:chat-stream:write-failed', {
              snapshotId,
              responseId,
              eventType,
              error: error instanceof Error ? error.message : String(error),
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
            snapshotId,
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

        request.signal.addEventListener('abort', abortHandler, { once: true });

        (async () => {
          try {
            for await (const event of events) {
              forwardChatEvent(event, {
                snapshotId,
                sendEvent,
                setResponseId: (value) => {
                  responseId = value;
                },
                getResponseId: () => responseId,
              });
            }
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Unable to complete chat stream';
            logger.error('company-intel:chat-stream:error', {
              snapshotId,
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
            request.signal.removeEventListener('abort', abortHandler);
          }
        })();
      },
      cancel() {
        abort();
      },
    });

    return new Response(stream, {
      headers: SSE_HEADERS,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to start chat stream';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

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
        headline: event.headline,
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
    case 'message-complete': {
      options.setResponseId(event.responseId);
      options.sendEvent({
        type: 'chat-message-complete',
        snapshotId: options.snapshotId,
        responseId: event.responseId,
        message: event.message,
        citations: event.citations,
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
