import { NextRequest } from 'next/server';

import { errorResponse, jsonResponse } from '@/server/handlers';
import { getCompanyIntelEnvironment } from '@/server/bootstrap';
import { PreviewCompanyIntelSchema } from '@/server/handlers/schemas';
import type { CollectSiteIntelOptions } from '@/server/web-search';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body) {
    return errorResponse('Invalid JSON payload', 400);
  }

  const parsed = PreviewCompanyIntelSchema.safeParse(body);
  if (!parsed.success) {
    return jsonResponse(
      {
        error: 'Invalid preview payload',
        details: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  try {
    const { server } = getCompanyIntelEnvironment();

    const domain = parsed.data.domain.trim();
    if (!domain) {
      return errorResponse('Domain is required', 400);
    }

    const options: CollectSiteIntelOptions | undefined = parsed.data.options && Object.keys(parsed.data.options).length > 0
      ? parsed.data.options
      : undefined;

    const preview = await server.preview(domain, options);

    return jsonResponse({
      data: preview,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to preview company intel';
    return errorResponse(message, 500);
  }
}
