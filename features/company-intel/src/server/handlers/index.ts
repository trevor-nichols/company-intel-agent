// ------------------------------------------------------------------------------------------------
//                index.ts - Shared utilities for Next.js route handlers
// ------------------------------------------------------------------------------------------------

import { NextResponse } from 'next/server';

export function errorResponse(message: string, status = 400): NextResponse {
  return jsonResponse({ error: message }, { status });
}

export function jsonResponse(payload: unknown, init?: ResponseInit): NextResponse {
  return NextResponse.json(payload, init);
}
