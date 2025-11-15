import type { CompanyIntelRunCoordinator } from '../server/runtime/runCoordinator';
import { success, error, type HttpResult } from './http';

export function handleRunCancel(runtime: CompanyIntelRunCoordinator, snapshotId: number): HttpResult {
  if (!Number.isFinite(snapshotId)) {
    return error('Invalid snapshot id', 400);
  }

  const activeRun = runtime.getActiveRunBySnapshot(snapshotId);
  if (!activeRun || activeRun.status !== 'running') {
    return error('No active run found for the provided snapshot id.', 404);
  }

  const cancelled = runtime.cancel(snapshotId, 'Cancelled by user request');
  if (!cancelled) {
    return error('Unable to cancel run.', 409);
  }

  return success({ success: true });
}
