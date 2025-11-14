import { afterEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

import type { CompanyIntelServer } from '@/server/bridge';

const getSnapshotByIdMock = vi.fn();

vi.mock('@/server/bootstrap', () => ({
  getCompanyIntelEnvironment: () => ({
    server: {
      getSnapshotById: getSnapshotByIdMock,
    } satisfies Pick<CompanyIntelServer, 'getSnapshotById'>,
  }),
}));

import { GET } from '../company-intel/snapshots/[id]/route';

describe('Company intel snapshot detail route', () => {
  afterEach(() => {
    getSnapshotByIdMock.mockReset();
  });

  it('returns 400 for invalid identifiers', async () => {
    const request = new NextRequest('http://localhost/api/company-intel/snapshots/abc');
    const response = await GET(request, { params: { id: 'abc' } });
    expect(response.status).toBe(400);
    const payload = await response.json();
    expect(payload.error).toMatch(/invalid snapshot/i);
  });

  it('returns 404 when no snapshot exists', async () => {
    getSnapshotByIdMock.mockResolvedValue(null);

    const request = new NextRequest('http://localhost/api/company-intel/snapshots/99');
    const response = await GET(request, { params: { id: '99' } });
    expect(response.status).toBe(404);
    const payload = await response.json();
    expect(payload.error).toMatch(/not found/i);
  });

  it('serializes snapshot records when found', async () => {
    const createdAt = new Date('2025-03-15T10:00:00.000Z');
    const completedAt = new Date('2025-03-15T10:05:00.000Z');
    getSnapshotByIdMock.mockResolvedValue({
      id: 7,
      status: 'complete',
      domain: 'example.com',
      selectedUrls: ['https://example.com/about'],
      mapPayload: { links: [] },
      summaries: { overview: 'Great company' },
      rawScrapes: [],
      error: null,
      progress: null,
      vectorStoreId: null,
      vectorStoreStatus: 'ready',
      vectorStoreError: null,
      vectorStoreFileCounts: null,
      createdAt,
      completedAt,
    });

    const request = new NextRequest('http://localhost/api/company-intel/snapshots/7');
    const response = await GET(request, { params: { id: '7' } });
    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.data).toMatchObject({
      id: 7,
      domain: 'example.com',
      summaries: { overview: 'Great company' },
    });
    expect(payload.data.createdAt).toBe(createdAt.toISOString());
    expect(payload.data.completedAt).toBe(completedAt.toISOString());
  });
});
