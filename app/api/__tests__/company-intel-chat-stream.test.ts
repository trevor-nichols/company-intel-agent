import { beforeEach, describe, expect, it, vi } from 'vitest';

import { NextRequest } from 'next/server';

const getSnapshotById = vi.fn();
const responsesStream = vi.fn();

const openAIStub = {
  responses: {
    stream: responsesStream,
  },
  vectorStores: {
    create: vi.fn(),
    fileBatches: {
      create: vi.fn(),
      poll: vi.fn(),
    },
  },
};

vi.mock('@company-intel/feature/server/bootstrap', () => ({
  getCompanyIntelEnvironment: () => ({
    persistence: {
      getSnapshotById,
    },
    openAI: openAIStub,
    chatModel: 'gpt-5.1',
    chatReasoningEffort: 'low',
  }),
}));

vi.mock('@company-intel/feature/server/agents/shared/openai', () => ({
  resolveOpenAIClient: () => openAIStub,
}));

import { POST } from '../company-intel/snapshots/[id]/chat/stream/route';

function buildRequest(messages: { role: 'user' | 'assistant' | 'system'; content: string }[]) {
  return new NextRequest('http://localhost/api/company-intel/snapshots/42/chat/stream', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
    },
    body: JSON.stringify({ messages }),
  });
}

describe('Company intel chat stream route', () => {
  beforeEach(() => {
    getSnapshotById.mockReset();
    responsesStream.mockReset();
  });

  it('returns 409 when the vector store is not ready', async () => {
    getSnapshotById.mockResolvedValueOnce({
      vectorStoreId: null,
      vectorStoreStatus: 'pending',
    });

    const response = await POST(buildRequest([{ role: 'user', content: 'hello' }]), {
      params: { id: '42' },
    });

    expect(response.status).toBe(409);
    expect(responsesStream).not.toHaveBeenCalled();
  });

  it('streams chat events when the snapshot is ready', async () => {
    getSnapshotById.mockResolvedValueOnce({
      vectorStoreId: 'vs_stream',
      vectorStoreStatus: 'ready',
      domain: 'acme.com',
    });

    const finalResponse = {
      id: 'resp_stream',
      output: [
        {
          type: 'message',
          status: 'completed',
          content: [
            {
              type: 'output_text',
              text: 'Streamed answer',
              annotations: [],
            },
          ],
        },
      ],
      usage: { total_tokens: 12 },
    };

    responsesStream.mockReturnValueOnce({
      abort: vi.fn(),
      async *[Symbol.asyncIterator]() {
        yield {
          type: 'response.created' as const,
          response: {
            id: 'resp_stream',
            model: 'gpt-5.1',
            output: [],
          },
        };
        yield {
          type: 'response.output_text.delta' as const,
          delta: 'Streamed ',
          output_index: 0,
          content_index: 0,
        };
        yield {
          type: 'response.output_text.delta' as const,
          delta: 'answer',
          output_index: 0,
          content_index: 0,
        };
        yield {
          type: 'response.completed' as const,
          response: finalResponse,
        };
      },
    });

    const response = await POST(buildRequest([{ role: 'user', content: 'hello' }]), {
      params: { id: '42' },
    });

    expect(response.headers.get('content-type')).toContain('text/event-stream');
    const payload = await response.text();
    expect(payload).toContain('"type":"chat-stream-start"');
    expect(payload).toContain('"type":"chat-message-delta"');
    expect(payload).toContain('"type":"chat-message-complete"');
    expect(payload.trim().endsWith('[DONE]')).toBe(true);
  });
});
