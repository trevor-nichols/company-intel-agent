import type { NextRequest } from 'next/server';

import { errorResponse } from '@/server/handlers';
import { getCompanyIntelEnvironment } from '@/server/bootstrap';
import { CompanyIntelSnapshotNotFoundError, CompanyIntelSnapshotNotReadyError } from '@/server/services/snapshotPdf';

export const runtime = 'nodejs';

export async function GET(request: NextRequest, { params }: { readonly params: { readonly id: string } }) {
  const snapshotId = Number.parseInt(params.id, 10);
  if (!Number.isFinite(snapshotId) || snapshotId <= 0) {
    return errorResponse('Invalid snapshot identifier', 400);
  }

  try {
    const { server } = getCompanyIntelEnvironment();

    const result = await server.generateSnapshotPdf({
      snapshotId,
    });

    const body = new Uint8Array(result.buffer);
    const headers = new Headers({
      'Content-Type': result.contentType,
      'Content-Disposition': `attachment; filename="${result.filename}"`,
      'Content-Length': String(body.length),
    });

    return new Response(body, {
      status: 200,
      headers,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to export snapshot PDF';
    if (error instanceof CompanyIntelSnapshotNotFoundError) {
      return errorResponse(message, 404);
    }
    if (error instanceof CompanyIntelSnapshotNotReadyError) {
      return errorResponse(message, 409);
    }
    return errorResponse(message, 500);
  }
}
