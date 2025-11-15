import type { NextRequest } from 'next/server';
import '@/app/api/company-intel/config';
import { getCompanyIntelEnvironment } from '@company-intel/feature/server/bootstrap';
import { handleSnapshotExport } from '@company-intel/feature/api/exportSnapshot';
import { toNextResponse } from '@company-intel/feature/adapters/next/http';

export const runtime = 'nodejs';

export async function GET(_request: NextRequest, context: { params: { id: string } }) {
  const snapshotId = Number.parseInt(context.params.id, 10);
  const env = getCompanyIntelEnvironment();
  const result = await handleSnapshotExport(env, snapshotId);
  return toNextResponse(result);
}
