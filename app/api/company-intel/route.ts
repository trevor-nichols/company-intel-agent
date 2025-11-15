import { NextRequest } from 'next/server';
import '@/app/api/company-intel/config';
import { logger } from '@company-intel/logging';

import { getCompanyIntelEnvironment } from '@company-intel/feature/server/bootstrap';
import {
  handleCompanyIntelGet,
  handleCompanyIntelPatch,
  validateTriggerPayload,
} from '@company-intel/feature/api/companyIntelRest';
import { createRunStream } from '@company-intel/feature/api/runStream';
import { toNextResponse, createSseResponse } from '@company-intel/feature/adapters/next/http';
import { error as httpError } from '@company-intel/feature/api/http';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const env = getCompanyIntelEnvironment();
  const limitParam = request.nextUrl.searchParams.get('limit');
  const parsed = limitParam ? Number.parseInt(limitParam, 10) : undefined;
  const limit = typeof parsed === 'number' && Number.isFinite(parsed) ? parsed : undefined;
  const result = await handleCompanyIntelGet(env, { limit });
  return toNextResponse(result);
}

export async function PATCH(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body) {
    return toNextResponse(httpError('Invalid JSON payload', 400));
  }

  const env = getCompanyIntelEnvironment();
  const result = await handleCompanyIntelPatch(env, body);
  return toNextResponse(result);
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body) {
    return toNextResponse(httpError('Invalid JSON payload', 400));
  }

  const validation = validateTriggerPayload(body);
  if (!validation.ok) {
    return toNextResponse(validation.response);
  }

  const acceptHeader = request.headers.get('accept') ?? '';
  if (!acceptHeader.toLowerCase().includes('text/event-stream')) {
    return toNextResponse(httpError('Streaming only endpoint. Set the Accept header to text/event-stream.', 406));
  }

  const { runtime } = getCompanyIntelEnvironment();
  const streamResult = await createRunStream(validation.payload, { runtime, logger }, { signal: request.signal });
  if (!streamResult.ok) {
    return toNextResponse(streamResult.response);
  }

  return createSseResponse(streamResult.stream);
}
