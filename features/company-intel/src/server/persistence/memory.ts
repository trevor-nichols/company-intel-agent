// ------------------------------------------------------------------------------------------------
//                memory.ts - In-memory persistence implementation for development/demo usage
// ------------------------------------------------------------------------------------------------

import { logger as defaultLogger, type Logger } from '@company-intel/logging';

import type {
  CompanyIntelPersistence,
  CompanyIntelProfileRecord,
  CompanyIntelProfileUpsert,
  CompanyIntelSnapshotCreateParams,
  CompanyIntelSnapshotRecord,
  CompanyIntelSnapshotUpdate,
  CompanyIntelPageInsert,
} from '../services/persistence';

interface InternalSnapshotRecord extends CompanyIntelSnapshotRecord {
  readonly createdAt: Date;
  readonly completedAt: Date | null;
}

interface MemoryPersistenceOptions {
  readonly logger?: Logger;
}

function clone<T>(value: T): T {
  if (typeof structuredClone === 'function') {
    return structuredClone(value);
  }
  return deepClone(value);
}

function deepClone<T>(value: T): T {
  if (value === null || typeof value !== 'object') {
    return value;
  }

  if (value instanceof Date) {
    return new Date(value.getTime()) as unknown as T;
  }

  if (Array.isArray(value)) {
    return (value as unknown[]).map(item => deepClone(item)) as unknown as T;
  }

  const source = value as Record<string, unknown>;
  const result: Record<string, unknown> = {};

  for (const [key, nested] of Object.entries(source)) {
    result[key] = deepClone(nested);
  }

  return result as T;
}

function ensureDate(value: Date | string | null | undefined): Date | null {
  if (!value) {
    return null;
  }
  return value instanceof Date ? new Date(value.getTime()) : new Date(value);
}

export class InMemoryCompanyIntelPersistence implements CompanyIntelPersistence {
  private readonly log: Logger;
  private profileSequence = 1;
  private snapshotSequence = 1;
  private profile: CompanyIntelProfileRecord | null = null;
  private readonly snapshots = new Map<number, InternalSnapshotRecord>();
  private readonly snapshotPages = new Map<number, CompanyIntelPageInsert[]>();
  private readonly snapshotOrder: number[] = [];

  constructor(options: MemoryPersistenceOptions = {}) {
    this.log = options.logger ?? defaultLogger;
  }

  async createSnapshot(params: CompanyIntelSnapshotCreateParams): Promise<CompanyIntelSnapshotRecord> {
    const id = this.snapshotSequence++;
    const createdAt = new Date();
    const record: InternalSnapshotRecord = {
      id,
      status: params.status ?? 'running',
      domain: params.domain ?? null,
      selectedUrls: null,
      mapPayload: null,
      summaries: null,
      rawScrapes: null,
      error: null,
      vectorStoreId: null,
      vectorStoreStatus: params.vectorStoreStatus ?? 'pending',
      vectorStoreError: null,
      vectorStoreFileCounts: null,
      progress: params.progress
        ? {
            stage: params.progress.stage,
            completed: params.progress.completed,
            total: params.progress.total,
            updatedAt: new Date(),
          }
        : null,
      createdAt,
      completedAt: null,
    } satisfies InternalSnapshotRecord;

    this.snapshots.set(id, record);
    this.snapshotPages.delete(id);

    this.snapshotOrder.unshift(id);

    this.log.debug('persistence:memory:snapshot:create', {
      snapshotId: id,
      domain: record.domain,
    });

    return clone(record);
  }

  async updateSnapshot(snapshotId: number, updates: CompanyIntelSnapshotUpdate): Promise<void> {
    const record = this.snapshots.get(snapshotId);
    if (!record) {
      throw new Error(`Snapshot ${snapshotId} not found in memory persistence`);
    }

    const next: InternalSnapshotRecord = {
      ...record,
      status: updates.status ?? record.status,
      domain: updates.domain ?? record.domain ?? null,
      selectedUrls: updates.selectedUrls !== undefined ? [...updates.selectedUrls] : record.selectedUrls ?? null,
      mapPayload: updates.mapPayload ?? record.mapPayload,
      summaries: updates.summaries ?? record.summaries,
      rawScrapes: updates.rawScrapes ?? record.rawScrapes,
      error: updates.error ?? record.error,
      vectorStoreId: updates.vectorStoreId === undefined ? record.vectorStoreId ?? null : updates.vectorStoreId,
      vectorStoreStatus: updates.vectorStoreStatus ?? record.vectorStoreStatus ?? 'pending',
      vectorStoreError: updates.vectorStoreError === undefined ? record.vectorStoreError ?? null : updates.vectorStoreError,
      vectorStoreFileCounts: updates.vectorStoreFileCounts === undefined
        ? record.vectorStoreFileCounts ?? null
        : updates.vectorStoreFileCounts,
      progress: updates.progress === undefined
        ? record.progress ?? null
        : updates.progress
            ? {
                stage: updates.progress.stage,
                completed: updates.progress.completed,
                total: updates.progress.total,
                updatedAt: updates.progress.updatedAt ? new Date(updates.progress.updatedAt.getTime()) : new Date(),
              }
            : null,
      completedAt: updates.completedAt !== undefined ? ensureDate(updates.completedAt) : record.completedAt,
    } satisfies InternalSnapshotRecord;

    this.snapshots.set(snapshotId, next);

    this.log.debug('persistence:memory:snapshot:update', {
      snapshotId,
      status: next.status,
    });
  }

  async replaceSnapshotPages(snapshotId: number, pages: readonly CompanyIntelPageInsert[]): Promise<void> {
    this.snapshotPages.set(snapshotId, pages.map(page => ({ ...page, metadata: { ...page.metadata } })));

    this.log.debug('persistence:memory:snapshot:pages', {
      snapshotId,
      pageCount: pages.length,
    });
  }

  async upsertProfile(params: CompanyIntelProfileUpsert): Promise<CompanyIntelProfileRecord> {
    const existing = this.profile;
    const now = new Date();

    const profile: CompanyIntelProfileRecord = {
      id: existing?.id ?? this.profileSequence++,
      status: params.status,
      domain: params.domain,
      companyName: params.companyName,
      tagline: params.tagline,
      overview: params.overview,
      valueProps: [...params.valueProps],
      keyOfferings: params.keyOfferings.map(offering => ({ ...offering })),
      primaryIndustries: [...params.primaryIndustries],
      faviconUrl: params.faviconUrl,
      lastSnapshotId: params.lastSnapshotId,
      activeSnapshotId: params.activeSnapshotId ?? null,
      activeSnapshotStartedAt: params.activeSnapshotStartedAt ?? null,
      lastRefreshedAt:
        params.lastRefreshedAt !== undefined
          ? params.lastRefreshedAt
          : existing?.lastRefreshedAt ?? null,
      lastError: params.lastError ?? null,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    } satisfies CompanyIntelProfileRecord;

    this.profile = profile;

    this.log.debug('persistence:memory:profile:upsert', {
      profileId: profile.id,
      domain: profile.domain,
    });

    return clone(profile);
  }

  async listSnapshots(params: { readonly limit?: number } = {}): Promise<readonly CompanyIntelSnapshotRecord[]> {
    const { limit } = params;
    const snapshotIds = typeof limit === 'number' ? this.snapshotOrder.slice(0, limit) : [...this.snapshotOrder];

    return snapshotIds
      .map(id => this.snapshots.get(id))
      .filter((record): record is InternalSnapshotRecord => Boolean(record))
      .map(record => clone(record));
  }

  async getProfile(): Promise<CompanyIntelProfileRecord | null> {
    return this.profile ? clone(this.profile) : null;
  }

  async getSnapshotById(snapshotId: number): Promise<CompanyIntelSnapshotRecord | null> {
    const record = this.snapshots.get(snapshotId);
    return record ? clone(record) : null;
  }

  async deleteSnapshot(snapshotId: number): Promise<void> {
    this.snapshots.delete(snapshotId);
    this.snapshotPages.delete(snapshotId);
    const index = this.snapshotOrder.indexOf(snapshotId);
    if (index !== -1) {
      this.snapshotOrder.splice(index, 1);
    }
    this.log.debug('persistence:memory:snapshot:delete', {
      snapshotId,
    });
  }

  getSnapshotPages(snapshotId: number): CompanyIntelPageInsert[] | null {
    const pages = this.snapshotPages.get(snapshotId);
    return pages ? pages.map(page => ({ ...page, metadata: { ...page.metadata } })) : null;
  }
}

export function createMemoryPersistence(options: MemoryPersistenceOptions = {}): InMemoryCompanyIntelPersistence {
  return new InMemoryCompanyIntelPersistence(options);
}
