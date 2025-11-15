import { describe, it, expect, vi } from 'vitest';
import { createChatStream } from '../chatStream';
import type { CompanyIntelPersistence, CompanyIntelSnapshotRecord } from '../../server/services/persistence';
import type { OpenAIClientLike } from '../../server/agents/shared/openai';
import type { ReasoningEffortLevel } from '../../server/agents/shared/reasoning';

vi.mock('../../server/agents/chat/client', () => ({
  runChatAgent: vi.fn(async () => ({
    events: (async function* () {
      yield { type: 'message-delta', snapshotId: 1, responseId: 'resp', delta: 'Hello' };
      yield { type: 'complete', snapshotId: 1, responseId: 'resp' };
    })(),
    abort: vi.fn(),
  })),
}));

const snapshot: CompanyIntelSnapshotRecord = {
  id: 1,
  status: 'complete',
  domain: 'acme.com',
  selectedUrls: [],
  mapPayload: null,
  summaries: null,
  rawScrapes: null,
  error: null,
  vectorStoreId: 'vs_1',
  vectorStoreStatus: 'ready',
  vectorStoreError: null,
  vectorStoreFileCounts: null,
  progress: null,
  createdAt: new Date('2024-01-02T00:00:00Z'),
  completedAt: new Date('2024-01-02T00:10:00Z'),
};

describe('createChatStream', () => {
  it('returns error when snapshot missing', async () => {
    const persistence = { getSnapshotById: vi.fn().mockResolvedValue(null) } as unknown as CompanyIntelPersistence;
    const result = await createChatStream({ snapshotId: 1, body: { messages: [{ role: 'user', content: 'Ping' }] } }, {
      persistence,
      openAI: {} as OpenAIClientLike,
      chatModel: 'gpt-5.1',
      chatReasoningEffort: 'low' as ReasoningEffortLevel,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(404);
    }
  });

  it('streams chat events when snapshot ready', async () => {
    const persistence = { getSnapshotById: vi.fn().mockResolvedValue(snapshot) } as unknown as CompanyIntelPersistence;

    const result = await createChatStream(
      { snapshotId: 1, body: { messages: [{ role: 'user', content: 'Hi' }] } },
      {
        persistence,
        openAI: {} as OpenAIClientLike,
        chatModel: 'gpt-5.1',
        chatReasoningEffort: 'low' as ReasoningEffortLevel,
      },
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const reader = result.stream.getReader();
    const chunks: string[] = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(new TextDecoder().decode(value));
      if (chunks.join('').includes('[DONE]')) break;
    }
    expect(chunks.join('')).toContain('chat-message-delta');
  });
});
