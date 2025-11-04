// ------------------------------------------------------------------------------------------------
//                index.ts - Shared utilities for Next.js route handlers
// ------------------------------------------------------------------------------------------------

import { NextResponse, type NextRequest } from 'next/server';

export interface RequestContext {
  readonly teamId: number;
  readonly userId: number;
}

const DEFAULT_TEAM_ID = 1;
const DEFAULT_USER_ID = 1;

function parseHeaderInt(value: string | null): number | null {
  if (!value) {
    return null;
  }
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

export function resolveRequestContext(request: NextRequest): RequestContext {
  const headerTeamId = parseHeaderInt(request.headers.get('x-team-id'));
  const headerUserId = parseHeaderInt(request.headers.get('x-user-id'));

  const paramTeamId = request.nextUrl.searchParams.get('teamId');
  const queryTeamId = parseHeaderInt(paramTeamId);

  const teamId = headerTeamId ?? queryTeamId ?? DEFAULT_TEAM_ID;
  const userId = headerUserId ?? DEFAULT_USER_ID;

  return {
    teamId,
    userId,
  } satisfies RequestContext;
}

export function jsonResponse(payload: unknown, init?: ResponseInit): NextResponse {
  return NextResponse.json(payload, init);
}

export function errorResponse(message: string, status = 400): NextResponse {
  return jsonResponse({ error: message }, { status });
}
