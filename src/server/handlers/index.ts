// ------------------------------------------------------------------------------------------------
//                index.ts - API handler factories for company intel feature - Dependencies: server adapters
// ------------------------------------------------------------------------------------------------

import { NextRequest, NextResponse } from 'next/server';

export type CompanyIntelHandler = (request: NextRequest) => Promise<NextResponse>;

export function createPlaceholderHandler(message: string): CompanyIntelHandler {
  return async () => NextResponse.json({ error: message }, { status: 501 });
}
