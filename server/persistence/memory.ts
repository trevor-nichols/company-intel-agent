// ------------------------------------------------------------------------------------------------
//                memory.ts - In-memory persistence implementation for development/demo usage
// ------------------------------------------------------------------------------------------------

import { logger as defaultLogger, type Logger } from '@agenai/logging';

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
  return typeof structuredClone === 'function'
    ? structuredClone(value)
    : JSON.parse(JSON.stringify(value)) as T;
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
      status: params.status ?? 'pending',
      domain: params.domain ?? null,
      selectedUrls: null,
      mapPayload: null,
      summaries: null,
      rawScrapes: null,
      error: null,
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
      lastRefreshedAt: params.lastRefreshedAt ?? now,
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

  getSnapshotPages(snapshotId: number): CompanyIntelPageInsert[] | null {
    const pages = this.snapshotPages.get(snapshotId);
    return pages ? pages.map(page => ({ ...page, metadata: { ...page.metadata } })) : null;
  }
}

export function createMemoryPersistence(options: MemoryPersistenceOptions = {}): InMemoryCompanyIntelPersistence {
  return new InMemoryCompanyIntelPersistence(options);
}
