import type { NextRequest } from 'next/server';

import { errorResponse, jsonResponse } from '@/server/handlers';
import { serializeSnapshot } from '@/server/handlers/serialization';
import { getCompanyIntelEnvironment } from '@/server/bootstrap';

export const runtime = 'nodejs';

export async function GET(request: NextRequest, { params }: { readonly params: { readonly id: string } }) {
  const snapshotId = Number.parseInt(params.id, 10);
  if (!Number.isFinite(snapshotId) || snapshotId <= 0) {
    return errorResponse('Invalid snapshot identifier', 400);
  }

  try {
    const { server } = getCompanyIntelEnvironment();
    const snapshot = await server.getSnapshotById(snapshotId);
    if (!snapshot) {
      return errorResponse('Snapshot not found', 404);
    }

    return jsonResponse({
      data: serializeSnapshot(snapshot),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to load snapshot';
    return errorResponse(message, 500);
  }
}
