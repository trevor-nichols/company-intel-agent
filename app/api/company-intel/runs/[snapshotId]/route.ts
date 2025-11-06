import { NextRequest } from 'next/server';

import { jsonResponse } from '@/server/handlers';
import { getCompanyIntelEnvironment } from '@/server/bootstrap';

export async function DELETE(_request: NextRequest, context: { params: { snapshotId: string } }) {
  const snapshotIdRaw = context.params.snapshotId;
  const snapshotId = Number.parseInt(snapshotIdRaw, 10);

  if (!Number.isFinite(snapshotId)) {
    return jsonResponse({ error: 'Invalid snapshot id' }, { status: 400 });
  }

  const { runtime } = getCompanyIntelEnvironment();
  const activeRun = runtime.getActiveRunBySnapshot(snapshotId);

  if (!activeRun || activeRun.status !== 'running') {
    return jsonResponse({ error: 'No active run found for the provided snapshot id.' }, { status: 404 });
  }

  const cancelled = runtime.cancel(snapshotId, 'Cancelled by user request');
  if (!cancelled) {
    return jsonResponse({ error: 'Unable to cancel run.' }, { status: 409 });
  }

  return jsonResponse({ success: true });
}
