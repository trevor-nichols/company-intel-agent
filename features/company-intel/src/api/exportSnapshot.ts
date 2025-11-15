import type { CompanyIntelEnvironment } from '../server/bootstrap';
import { CompanyIntelSnapshotNotFoundError, CompanyIntelSnapshotNotReadyError } from '../server/services/snapshotPdf';
import { success, error, type HttpResult } from './http';

export async function handleSnapshotExport(env: CompanyIntelEnvironment, snapshotId: number): Promise<HttpResult> {
  if (!Number.isFinite(snapshotId) || snapshotId <= 0) {
    return error('Invalid snapshot identifier', 400);
  }

  try {
    const result = await env.server.generateSnapshotPdf({ snapshotId });
    return success(result.buffer, 200, {
      'Content-Type': result.contentType,
      'Content-Length': String(result.buffer.byteLength),
      'Content-Disposition': `attachment; filename="${result.filename}"`,
    });
  } catch (err) {
    if (err instanceof CompanyIntelSnapshotNotFoundError) {
      return error('Snapshot not found', 404);
    }
    if (err instanceof CompanyIntelSnapshotNotReadyError) {
      return error(err.message, 409);
    }
    const message = err instanceof Error ? err.message : 'Unable to export snapshot';
    return error(message, 500);
  }
}
