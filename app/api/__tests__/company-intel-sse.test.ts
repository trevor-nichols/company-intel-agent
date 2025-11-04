import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { CompanyIntelServer } from '@/server/bridge';

const runCollectionMock = vi.fn();

vi.mock('@/server/bootstrap', () => ({
  getCompanyIntelEnvironment: () => ({
    server: {
      runCollection: runCollectionMock,
    } satisfies Pick<CompanyIntelServer, 'runCollection'>,
  }),
}));

import { POST } from '../company-intel/route';
import { NextRequest } from 'next/server';

describe('Company intel SSE route', () => {
  beforeEach(() => {
    runCollectionMock.mockImplementation(async (_params, overrides) => {
      overrides?.onEvent?.({
        type: 'snapshot-created',
        snapshotId: 99,
        teamId: 1,
        domain: 'https://example.com',
        status: 'pending',
      });
      overrides?.onEvent?.({
        type: 'status',
        snapshotId: 99,
        teamId: 1,
        domain: 'https://example.com',
        stage: 'mapping',
      });

      return {
        snapshotId: 99,
        teamId: 1,
        status: 'complete',
        selections: [],
        totalLinksMapped: 4,
        successfulPages: 4,
        failedPages: 0,
      };
    });
  });

  afterEach(() => {
    runCollectionMock.mockReset();
  });

  it('streams SSE frames followed by [DONE]', async () => {
    const body = JSON.stringify({ domain: 'example.com' });
    const request = new NextRequest('http://localhost/api/company-intel', {
      method: 'POST',
      headers: {
        Accept: 'text/event-stream',
        'Content-Type': 'application/json',
      },
      body,
    });

    const response = await POST(request);
    expect(response.headers.get('content-type')).toContain('text/event-stream');

    const reader = response.body?.getReader();
    expect(reader).toBeDefined();

    let buffer = '';
    while (reader) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      buffer += new TextDecoder().decode(value, { stream: true });
    }

    const frames = buffer
      .split('\n\n')
      .map(frame => frame.trim())
      .filter(Boolean);

    expect(frames.at(-1)).toBe('data: [DONE]');

    const payloads = frames
      .filter(frame => frame !== 'data: [DONE]')
      .map(frame => frame.replace(/^data: /, ''))
      .map(chunk => JSON.parse(chunk));

    expect(payloads[0]).toMatchObject({ type: 'snapshot-created' });
    expect(payloads[1]).toMatchObject({ type: 'status', stage: 'mapping' });
    expect(payloads.at(-1)).toMatchObject({ type: 'run-complete', result: { status: 'complete' } });

    expect(runCollectionMock).toHaveBeenCalledTimes(1);
    const [params] = runCollectionMock.mock.calls[0];
    expect(params).toMatchObject({ domain: 'example.com', teamId: 1 });
  });
});
