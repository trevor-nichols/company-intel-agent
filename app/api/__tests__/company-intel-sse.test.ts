import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CompanyIntelStreamEvent } from '@/shared/company-intel/types';

const startRunMock = vi.fn();
const subscribeMock = vi.fn();

vi.mock('@/server/bootstrap', () => ({
  getCompanyIntelEnvironment: () => ({
    server: {
      runCollection: vi.fn(),
    },
    runtime: {
      startRun: startRunMock,
      subscribe: subscribeMock,
      getActiveRunForDomain: () => null,
    },
  }),
}));

import { POST } from '../company-intel/route';
import { NextRequest } from 'next/server';

describe('Company intel SSE route', () => {
  beforeEach(() => {
    startRunMock.mockResolvedValue({
      snapshotId: 99,
      domain: 'https://example.com',
      startedAt: new Date(),
    });

    subscribeMock.mockImplementation((_snapshotId, listener: (event: CompanyIntelStreamEvent) => void) => {
      listener({
        type: 'snapshot-created',
        snapshotId: 99,
        domain: 'https://example.com',
        status: 'running',
      });
      listener({
        type: 'status',
        snapshotId: 99,
        domain: 'https://example.com',
        stage: 'mapping',
      });
      listener({
        type: 'run-complete',
        snapshotId: 99,
        domain: 'https://example.com',
        result: {
          snapshotId: 99,
          status: 'complete',
          selections: [],
          totalLinksMapped: 4,
          successfulPages: 4,
          failedPages: 0,
        },
      });
      return {
        unsubscribe: vi.fn(),
      };
    });
  });

  afterEach(() => {
    startRunMock.mockReset();
    subscribeMock.mockReset();
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

    expect(startRunMock).toHaveBeenCalledTimes(1);
    const [params] = startRunMock.mock.calls[0];
    expect(params).toMatchObject({ domain: 'example.com' });
    expect(subscribeMock).toHaveBeenCalledTimes(1);
  });
});
