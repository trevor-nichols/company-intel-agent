// ------------------------------------------------------------------------------------------------
//                index.ts - Shared mappers for company intel feature - Dependencies: shared types
// ------------------------------------------------------------------------------------------------

import type {
  CompanyIntelSelection,
  CompanyIntelSnapshotPreview,
} from '../types';

export function buildSnapshotPreview(params: {
  domain: string;
  totalLinksMapped: number;
  successfulPages: number;
  failedPages: number;
  selections: readonly CompanyIntelSelection[];
}): CompanyIntelSnapshotPreview {
  return {
    domain: params.domain,
    totalLinksMapped: params.totalLinksMapped,
    successfulPages: params.successfulPages,
    failedPages: params.failedPages,
    selections: params.selections,
  };
}
