import { describe, it, expect, vi } from 'vitest';
import type { CompanyIntelRunCoordinator, RunSubscription } from '../../server/runtime/runCoordinator';
import type { CompanyIntelStreamEvent } from '../../shared/types';
import { createRunStream } from '../runStream';

const decoder = new TextDecoder();

describe('createRunStream', () => {
  it('returns SSE payload for a successful run', async () => {
    const events: CompanyIntelStreamEvent[] = [
      { type: 'status', snapshotId: 1, domain: 'acme.com', stage: 'mapping' },
      { type: 'run-complete', snapshotId: 1, domain: 'acme.com', result: {
        snapshotId: 1,
        status: 'complete',
        selections: [],
        totalLinksMapped: 1,
        successfulPages: 1,
        failedPages: 0,
      } },
    ];

    const runtime: Partial<CompanyIntelRunCoordinator> = {
      startRun: vi.fn().mockResolvedValue({ snapshotId: 1, domain: 'acme.com', startedAt: new Date() }),
      subscribe: vi.fn((_snapshotId, listener) => {
        events.forEach(listener as (event: CompanyIntelStreamEvent) => void);
        return { unsubscribe: vi.fn() } as RunSubscription;
      }),
    };

    const result = await createRunStream({ domain: 'acme.com' }, { runtime: runtime as CompanyIntelRunCoordinator });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const reader = result.stream.getReader();
    const chunks: string[] = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(decoder.decode(value));
      if (chunks.join('').includes('[DONE]')) break;
    }

    expect(chunks.join('')).toContain('"type":"status"');
    expect(chunks.join('')).toContain('[DONE]');
  });
});
