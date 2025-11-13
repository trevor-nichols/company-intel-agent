import { beforeEach, describe, expect, it, vi } from 'vitest';

import { NextRequest } from 'next/server';

const getSnapshotById = vi.fn();
const responsesCreate = vi.fn();
const responsesStream = vi.fn();

const openAIStub = {
  responses: {
    create: responsesCreate,
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

vi.mock('@/server/bootstrap', () => ({
  getCompanyIntelEnvironment: () => ({
    persistence: {
      getSnapshotById,
    },
    openAI: openAIStub,
    chatModel: 'gpt-5',
  }),
}));

vi.mock('@/server/agents/shared/openai', () => ({
  resolveOpenAIClient: () => openAIStub,
}));

import { POST } from '../company-intel/snapshots/[id]/chat/route';

function buildRequest(messages: { role: 'user' | 'assistant' | 'system'; content: string }[]) {
  return new NextRequest('http://localhost/api/company-intel/snapshots/42/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ messages }),
  });
}

describe('Company intel chat route', () => {
  beforeEach(() => {
    getSnapshotById.mockReset();
    responsesCreate.mockReset();
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
    expect(responsesCreate).not.toHaveBeenCalled();
  });

  it('invokes the Responses API with vector store ids and include directives', async () => {
    getSnapshotById.mockResolvedValueOnce({
      vectorStoreId: 'vs_123',
      vectorStoreStatus: 'ready',
      domain: 'acme.com',
    });

    responsesCreate.mockResolvedValueOnce({
      id: 'resp_test',
      output: [
        {
          type: 'message',
          content: [
            {
              type: 'output_text',
              text: 'Answer',
            },
          ],
        },
      ],
    });

    const response = await POST(buildRequest([{ role: 'user', content: 'hello' }]), {
      params: { id: '42' },
    });

    expect(response.status).toBe(200);
    expect(responsesCreate).toHaveBeenCalledTimes(1);
    expect(responsesCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        tools: [
          expect.objectContaining({
            type: 'file_search',
            vector_store_ids: ['vs_123'],
            max_num_results: 6,
          }),
        ],
        include: ['file_search_call.results'],
      }),
    );

    const payload = await response.json();
    expect(payload.data.message).toBe('Answer');
  });

  it('returns citations from file search results and annotations', async () => {
    getSnapshotById.mockResolvedValueOnce({
      vectorStoreId: 'vs_999',
      vectorStoreStatus: 'ready',
      domain: 'acme.com',
    });

    responsesCreate.mockResolvedValueOnce({
      id: 'resp_with_citations',
      usage: { total_tokens: 42 },
      output: [
        {
          type: 'file_search_call',
          results: [
            {
              file_id: 'file-1',
              filename: 'one.pdf',
              score: 0.92,
              content: [
                {
                  text: 'Snippet from file 1',
                },
              ],
            },
          ],
        },
        {
          type: 'message',
          content: [
            {
              type: 'output_text',
              text: 'Combined answer',
              annotations: [
                {
                  type: 'file_citation',
                  file_id: 'file-2',
                  filename: 'two.pdf',
                  quote: 'Snippet from file 2',
                  index: 128,
                },
              ],
            },
          ],
        },
      ],
    });

    const response = await POST(buildRequest([{ role: 'user', content: 'hello' }]), {
      params: { id: '42' },
    });

    const payload = await response.json();
    expect(payload.data.citations).toEqual([
      {
        fileId: 'file-1',
        filename: 'one.pdf',
        score: 0.92,
        chunks: [
          {
            text: 'Snippet from file 1',
          },
        ],
      },
      {
        fileId: 'file-2',
        filename: 'two.pdf',
        quote: 'Snippet from file 2',
        index: 128,
        chunks: [
          {
            text: 'Snippet from file 2',
          },
        ],
      },
    ]);
  });
});
