import { NextRequest } from 'next/server';
import '@/app/api/company-intel/config';
import { getCompanyIntelEnvironment } from '@company-intel/feature/server/bootstrap';
import { createExistingRunStream } from '@company-intel/feature/api/runStream';
import { createSseResponse, toNextResponse } from '@company-intel/feature/adapters/next/http';

export async function GET(request: NextRequest, context: { params: { snapshotId: string } }) {
  const snapshotId = Number.parseInt(context.params.snapshotId, 10);
  const { runtime } = getCompanyIntelEnvironment();
  const streamResult = createExistingRunStream(snapshotId, { runtime });
  if (!streamResult.ok) {
    return toNextResponse(streamResult.response);
  }
  return createSseResponse(streamResult.stream);
}
