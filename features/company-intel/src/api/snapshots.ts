import type { CompanyIntelEnvironment } from '../server/bootstrap';
import { serializeSnapshot } from '../server/handlers/serialization';
import { success, error, type HttpResult } from './http';

export async function handleSnapshotDetail(env: CompanyIntelEnvironment, snapshotId: number): Promise<HttpResult> {
  if (!Number.isFinite(snapshotId) || snapshotId <= 0) {
    return error('Invalid snapshot identifier', 400);
  }

  try {
    const snapshot = await env.server.getSnapshotById(snapshotId);
    if (!snapshot) {
      return error('Snapshot not found', 404);
    }

    return success({ data: serializeSnapshot(snapshot) });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unable to load snapshot';
    return error(message, 500);
  }
}
