import { NextRequest } from 'next/server';
import '@/app/api/company-intel/config';
import { getCompanyIntelEnvironment } from '@company-intel/feature/server/bootstrap';
import { handleRunCancel } from '@company-intel/feature/api/runCancel';
import { toNextResponse } from '@company-intel/feature/adapters/next/http';

export async function DELETE(_request: NextRequest, context: { params: { snapshotId: string } }) {
  const snapshotId = Number.parseInt(context.params.snapshotId, 10);
  const { runtime } = getCompanyIntelEnvironment();
  const result = handleRunCancel(runtime, snapshotId);
  return toNextResponse(result);
}
