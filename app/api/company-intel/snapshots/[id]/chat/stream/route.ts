import { NextRequest } from 'next/server';
import { logger } from '@agenai/logging';
import type { ResponseCreateParams } from 'openai/resources/responses/responses';

import { getCompanyIntelEnvironment } from '@/server/bootstrap';
import { resolveOpenAIClient } from '@/server/agents/shared/openai';
import { extractResponseText } from '@/server/agents/shared/response';
import { validateChatRequestBody } from '@/server/agents/chat/validation';
import { buildChatSystemPrompt } from '@/server/agents/chat/prompts';
import { extractChatCitations } from '@/server/agents/chat/citations';
import {
  COMPANY_INTEL_CHAT_MAX_MESSAGES,
  type CompanyIntelChatStreamEvent,
} from '@/shared/company-intel/chat';

export const runtime = 'nodejs';

const DEFAULT_VECTOR_RESULTS = 6;
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
    const openAIClient = resolveOpenAIClient(openAI);
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
    const input = [
      { role: 'system', content: systemPrompt },
      ...validation.messages,
    ] as ResponseCreateParams['input'];

    const modelStream = await openAIClient.responses.stream({
      model: chatModel,
      input,
      stream: true,
      reasoning: { effort: 'low' },
      tools: [
        {
          type: 'file_search',
          vector_store_ids: [snapshot.vectorStoreId],
          max_num_results: DEFAULT_VECTOR_RESULTS,
        },
      ],
      include: ['file_search_call.results'],
      metadata: {
        snapshot_id: String(snapshotId),
      },
    });

    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        let isClosed = false;
        let responseId: string | null = null;
        const summaryBuffers = new Map<number, string>();

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
          modelStream.abort();
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
            for await (const event of modelStream) {
              switch (event.type) {
                case 'response.created': {
                  responseId = event.response.id;
                  sendEvent({
                    type: 'chat-stream-start',
                    snapshotId,
                    responseId,
                    model: event.response.model ?? null,
                  });
                  break;
                }
                case 'response.output_text.delta': {
                  sendEvent({
                    type: 'chat-message-delta',
                    snapshotId,
                    responseId,
                    delta: event.delta,
                  });
                  break;
                }
                case 'response.reasoning_summary_text.delta': {
                  const index = event.summary_index ?? 0;
                  const existing = summaryBuffers.get(index) ?? '';
                  summaryBuffers.set(index, `${existing}${event.delta}`);
                  sendEvent({
                    type: 'chat-reasoning-delta',
                    summaryIndex: index,
                    delta: event.delta,
                    snapshotId,
                    responseId,
                  });
                  break;
                }
                case 'response.reasoning_summary_text.done': {
                  const index = event.summary_index ?? 0;
                  const text = event.text ?? summaryBuffers.get(index) ?? '';
                  summaryBuffers.set(index, text);
                  sendEvent({
                    type: 'chat-reasoning-summary',
                    summaryIndex: index,
                    text,
                    headline: deriveHeadline(text),
                    snapshotId,
                    responseId,
                  });
                  break;
                }
                case 'response.file_search_call.in_progress': {
                  sendEvent({
                    type: 'chat-tool-status',
                    tool: 'file_search',
                    status: 'in_progress',
                    snapshotId,
                    responseId,
                  });
                  break;
                }
                case 'response.file_search_call.searching': {
                  sendEvent({
                    type: 'chat-tool-status',
                    tool: 'file_search',
                    status: 'searching',
                    snapshotId,
                    responseId,
                  });
                  break;
                }
                case 'response.file_search_call.completed': {
                  sendEvent({
                    type: 'chat-tool-status',
                    tool: 'file_search',
                    status: 'completed',
                    snapshotId,
                    responseId,
                  });
                  break;
                }
                case 'error': {
                  throw new Error(event.message ?? 'Model returned an error');
                }
                case 'response.failed': {
                  const errorMessage = event.response.error?.message ?? 'Model failed to complete the chat response';
                  throw new Error(errorMessage);
                }
                case 'response.completed': {
                  responseId = event.response.id;
                  const message = extractResponseText(event.response);
                  const citations = extractChatCitations(event.response);
                  const usage = event.response.usage as Record<string, unknown> | undefined;

                  sendEvent({
                    type: 'chat-message-complete',
                    message,
                    citations,
                    snapshotId,
                    responseId,
                  });

                  sendEvent({
                    type: 'chat-usage',
                    usage,
                    snapshotId,
                    responseId,
                  });

                  sendEvent({
                    type: 'chat-complete',
                    snapshotId,
                    responseId,
                  });
                  break;
                }
                case 'response.incomplete': {
                  throw new Error('Response ended before completion');
                }
                default:
                  // ignore other event types for now
                  break;
              }
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
        modelStream.abort();
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

function deriveHeadline(text: string | null | undefined): string | null {
  if (!text) {
    return null;
  }
  const trimmed = text.trim();
  if (!trimmed) {
    return null;
  }
  const [firstLine] = trimmed.split('\n');
  if (!firstLine) {
    return null;
  }
  return firstLine.replace(/^[#*\s]+/, '').trim() || null;
}
