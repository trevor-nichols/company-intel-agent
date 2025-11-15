import type { NextRequest } from 'next/server';
import '@/app/api/company-intel/config';
import { getCompanyIntelEnvironment } from '@company-intel/feature/server/bootstrap';
import { handleSnapshotDetail } from '@company-intel/feature/api/snapshots';
import { toNextResponse } from '@company-intel/feature/adapters/next/http';

export const runtime = 'nodejs';

export async function GET(_request: NextRequest, { params }: { readonly params: { readonly id: string } }) {
  const snapshotId = Number.parseInt(params.id, 10);
  const env = getCompanyIntelEnvironment();
  const result = await handleSnapshotDetail(env, snapshotId);
  return toNextResponse(result);
}
