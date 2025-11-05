// ------------------------------------------------------------------------------------------------
//                serialization.ts - Helpers to map server records to transport-safe payloads
// ------------------------------------------------------------------------------------------------

import type { CompanyIntelProfileRecord, CompanyIntelSnapshotRecord } from '../services/persistence';

function cloneJson<T>(value: T): T {
  if (value === null || value === undefined) {
    return value;
  }
  if (typeof structuredClone === 'function') {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value)) as T;
}

export function serializeProfile(record: CompanyIntelProfileRecord | null): Record<string, unknown> | null {
  if (!record) {
    return null;
  }

  return {
    id: record.id,
    domain: record.domain,
    status: record.status,
    companyName: record.companyName,
    tagline: record.tagline,
    overview: record.overview,
    valueProps: [...record.valueProps],
    keyOfferings: record.keyOfferings.map(offering => ({ ...offering })),
    primaryIndustries: [...record.primaryIndustries],
    faviconUrl: record.faviconUrl,
    lastSnapshotId: record.lastSnapshotId,
    activeSnapshotId: record.activeSnapshotId,
    activeSnapshotStartedAt: record.activeSnapshotStartedAt ? record.activeSnapshotStartedAt.toISOString() : null,
    lastRefreshedAt: record.lastRefreshedAt ? record.lastRefreshedAt.toISOString() : null,
    lastError: record.lastError,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  } satisfies Record<string, unknown>;
}

export function serializeSnapshot(record: CompanyIntelSnapshotRecord): Record<string, unknown> {
  return {
    id: record.id,
    domain: record.domain ?? null,
    status: record.status,
    selectedUrls: Array.isArray(record.selectedUrls) ? [...record.selectedUrls] : null,
    mapPayload: cloneJson(record.mapPayload ?? null),
    summaries: cloneJson(record.summaries ?? null),
    rawScrapes: cloneJson(record.rawScrapes ?? null),
    error: record.error ?? null,
    progress: record.progress
      ? {
          stage: record.progress.stage,
          completed: record.progress.completed ?? null,
          total: record.progress.total ?? null,
          updatedAt: record.progress.updatedAt.toISOString(),
        }
      : null,
    createdAt: record.createdAt ? record.createdAt.toISOString() : new Date().toISOString(),
    completedAt: record.completedAt ? record.completedAt.toISOString() : null,
  } satisfies Record<string, unknown>;
}
