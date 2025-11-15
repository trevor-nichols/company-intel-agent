import { NextRequest } from 'next/server';

import '@/app/api/company-intel/config';
import { getCompanyIntelEnvironment } from '@company-intel/feature/server/bootstrap';
import { handleCompanyIntelPreview } from '@company-intel/feature/api/preview';
import { toNextResponse } from '@company-intel/feature/adapters/next/http';
import { error as httpError } from '@company-intel/feature/api/http';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body) {
    return toNextResponse(httpError('Invalid JSON payload', 400));
  }

  const env = getCompanyIntelEnvironment();
  const result = await handleCompanyIntelPreview(env, body);
  return toNextResponse(result);
}
