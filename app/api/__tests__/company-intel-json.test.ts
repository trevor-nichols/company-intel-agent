import { afterEach, describe, expect, it, vi } from 'vitest';

import { NextRequest } from 'next/server';
import type { RunCompanyIntelCollectionResult } from '@/server/services/run-collection';

const runToCompletionMock = vi.fn();

vi.mock('@/server/bootstrap', () => ({
  getCompanyIntelEnvironment: () => ({
    server: {
      runCollection: vi.fn(),
    },
    runtime: {
      runToCompletion: runToCompletionMock,
      getActiveRunForDomain: () => null,
    },
    persistence: {
      getProfile: vi.fn(),
      listSnapshots: vi.fn(),
    },
    openAI: {
      responses: {
        create: vi.fn(),
      },
    },
    chatModel: 'gpt-5',
  }),
}));

import { POST } from '../company-intel/route';

describe('Company intel JSON route', () => {
  afterEach(() => {
    runToCompletionMock.mockReset();
  });

  it('routes non-streaming requests through the runtime coordinator', async () => {
    const result: RunCompanyIntelCollectionResult = {
      snapshotId: 42,
      status: 'complete',
      selections: [],
      totalLinksMapped: 10,
      successfulPages: 9,
      failedPages: 1,
    };

    runToCompletionMock.mockResolvedValueOnce(result);

    const request = new NextRequest('http://localhost/api/company-intel', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ domain: 'example.com' }),
    });

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({ data: result });
    expect(runToCompletionMock).toHaveBeenCalledTimes(1);
    expect(runToCompletionMock).toHaveBeenCalledWith({ domain: 'example.com' });
  });
});
