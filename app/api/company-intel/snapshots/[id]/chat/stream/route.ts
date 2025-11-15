import { NextRequest } from 'next/server';
import '@/app/api/company-intel/config';
import { logger } from '@company-intel/logging';
import { getCompanyIntelEnvironment } from '@company-intel/feature/server/bootstrap';
import { createChatStream } from '@company-intel/feature/api/chatStream';
import { createSseResponse, toNextResponse } from '@company-intel/feature/adapters/next/http';
import { error as httpError } from '@company-intel/feature/api/http';

export const runtime = 'nodejs';

export async function POST(request: NextRequest, context: { params: { id: string } }) {
  const snapshotId = Number.parseInt(context.params.id, 10);
  if (!Number.isFinite(snapshotId)) {
    return toNextResponse(httpError('Invalid snapshot id', 400));
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return toNextResponse(httpError('Invalid JSON payload', 400));
  }

  const { persistence, openAI, chatModel, chatReasoningEffort } = getCompanyIntelEnvironment();
  const result = await createChatStream(
    { snapshotId, body },
    { persistence, openAI, chatModel, chatReasoningEffort, logger },
    { signal: request.signal },
  );

  if (!result.ok) {
    return toNextResponse(result.response);
  }

  return createSseResponse(result.stream);
}
