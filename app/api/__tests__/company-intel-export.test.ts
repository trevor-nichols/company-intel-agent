import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

import type { CompanyIntelServer } from '@/server/bridge';

const generateSnapshotPdfMock = vi.fn();

vi.mock('@/server/bootstrap', () => ({
  getCompanyIntelEnvironment: () => ({
    server: {
      generateSnapshotPdf: generateSnapshotPdfMock,
    } satisfies Pick<CompanyIntelServer, 'generateSnapshotPdf'>,
    runtime: {
      runToCompletion: vi.fn(),
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

import { GET } from '../company-intel/snapshots/[id]/export/route';

describe('Company intel snapshot export route', () => {
  const pdfBuffer = Buffer.from('%PDF-1.7\n', 'utf8');

  beforeEach(() => {
    generateSnapshotPdfMock.mockResolvedValue({
      filename: 'company-intel-example-20250101.pdf',
      contentType: 'application/pdf' as const,
      buffer: pdfBuffer,
      snapshotId: 123,
      generatedAtIso: '2025-01-01T00:00:00.000Z',
    });
  });

  afterEach(() => {
    generateSnapshotPdfMock.mockReset();
  });

  it('returns a PDF attachment with the expected headers and body', async () => {
    const request = new NextRequest('http://localhost/api/company-intel/snapshots/123/export');

    const response = await GET(request, { params: { id: '123' } });

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('application/pdf');
    expect(response.headers.get('content-disposition')).toContain('company-intel-example-20250101.pdf');

    const body = Buffer.from(await response.arrayBuffer());
    expect(body.equals(pdfBuffer)).toBe(true);

    expect(generateSnapshotPdfMock).toHaveBeenCalledWith({
      snapshotId: 123,
    });
  });
});
