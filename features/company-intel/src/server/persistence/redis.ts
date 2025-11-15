// ------------------------------------------------------------------------------------------------
//                redis.ts - Redis-backed persistence implementation
// ------------------------------------------------------------------------------------------------

import Redis, { type Redis as RedisClient } from 'ioredis';
import { logger as defaultLogger, type Logger } from '../../config/logging';

import type {
  CompanyIntelPersistence,
  CompanyIntelProfileRecord,
  CompanyIntelProfileUpsert,
  CompanyIntelSnapshotCreateParams,
  CompanyIntelSnapshotRecord,
  CompanyIntelSnapshotUpdate,
  CompanyIntelPageInsert,
} from '../services/persistence';
import type { CompanyIntelRunStage } from '../../shared/types';

type PersistedSnapshotProgress = {
  readonly stage: CompanyIntelRunStage;
  readonly completed?: number;
  readonly total?: number;
  readonly updatedAtIso: string;
};

type PersistedSnapshotRecord = Omit<CompanyIntelSnapshotRecord, 'createdAt' | 'completedAt' | 'progress'> & {
  readonly createdAtIso: string;
  readonly completedAtIso: string | null;
  readonly progress?: PersistedSnapshotProgress | null;
};

type PersistedProfileRecord = Omit<CompanyIntelProfileRecord, 'createdAt' | 'updatedAt' | 'lastRefreshedAt' | 'activeSnapshotStartedAt'> & {
  readonly createdAtIso: string;
  readonly updatedAtIso: string;
  readonly lastRefreshedAtIso: string | null;
  readonly activeSnapshotStartedAtIso: string | null;
};

interface PersistedSnapshotPages {
  readonly pages: readonly CompanyIntelPageInsert[];
}

export interface RedisPersistenceOptions {
  readonly url?: string;
  readonly redis?: RedisClient;
  readonly prefix?: string;
  readonly logger?: Logger;
}

function ensureRedisClient(options: RedisPersistenceOptions): { client: RedisClient; ownsClient: boolean } {
  if (options.redis) {
    return { client: options.redis, ownsClient: false };
  }

  if (!options.url) {
    throw new Error('Redis URL is required when redis client is not provided');
  }

  const client = new Redis(options.url, {
    lazyConnect: true,
    maxRetriesPerRequest: 2,
  });

  return { client, ownsClient: true };
}

function serializeSnapshot(record: CompanyIntelSnapshotRecord): PersistedSnapshotRecord {
  return {
    ...record,
    progress: record.progress
      ? {
          stage: record.progress.stage,
          completed: record.progress.completed,
          total: record.progress.total,
          updatedAtIso: record.progress.updatedAt.toISOString(),
        }
      : null,
    createdAtIso: record.createdAt ? record.createdAt.toISOString() : new Date().toISOString(),
    completedAtIso: record.completedAt ? record.completedAt.toISOString() : null,
  } satisfies PersistedSnapshotRecord;
}

function deserializeSnapshot(payload: PersistedSnapshotRecord): CompanyIntelSnapshotRecord {
  const { createdAtIso, completedAtIso, progress, ...rest } = payload;
  return {
    ...rest,
    progress: progress
      ? {
          stage: progress.stage,
          completed: progress.completed,
          total: progress.total,
          updatedAt: new Date(progress.updatedAtIso),
        }
      : null,
    createdAt: new Date(createdAtIso),
    completedAt: completedAtIso ? new Date(completedAtIso) : null,
  } satisfies CompanyIntelSnapshotRecord;
}

function serializeProfile(record: CompanyIntelProfileRecord): PersistedProfileRecord {
  return {
    ...record,
    valueProps: [...record.valueProps],
    keyOfferings: record.keyOfferings.map(offering => ({ ...offering })),
    primaryIndustries: [...record.primaryIndustries],
    createdAtIso: record.createdAt.toISOString(),
    updatedAtIso: record.updatedAt.toISOString(),
    lastRefreshedAtIso: record.lastRefreshedAt ? record.lastRefreshedAt.toISOString() : null,
    activeSnapshotStartedAtIso: record.activeSnapshotStartedAt ? record.activeSnapshotStartedAt.toISOString() : null,
  } satisfies PersistedProfileRecord;
}

function deserializeProfile(payload: PersistedProfileRecord): CompanyIntelProfileRecord {
  const { createdAtIso, updatedAtIso, lastRefreshedAtIso, activeSnapshotStartedAtIso, ...rest } = payload;
  return {
    ...rest,
    valueProps: [...payload.valueProps],
    keyOfferings: payload.keyOfferings.map(offering => ({ ...offering })),
    primaryIndustries: [...payload.primaryIndustries],
    createdAt: new Date(createdAtIso),
    updatedAt: new Date(updatedAtIso),
    lastRefreshedAt: lastRefreshedAtIso ? new Date(lastRefreshedAtIso) : null,
    activeSnapshotStartedAt: activeSnapshotStartedAtIso ? new Date(activeSnapshotStartedAtIso) : null,
  } satisfies CompanyIntelProfileRecord;
}

export class RedisCompanyIntelPersistence implements CompanyIntelPersistence {
  private readonly redis: RedisClient;
  private readonly prefix: string;
  private readonly log: Logger;
  private readonly ownsClient: boolean;

  constructor(options: RedisPersistenceOptions) {
    const { client, ownsClient } = ensureRedisClient(options);
    this.redis = client;
    this.ownsClient = ownsClient;
    this.prefix = options.prefix ?? 'ci';
    this.log = options.logger ?? defaultLogger;
  }

  private profileKey(): string {
    return `${this.prefix}:profile`;
  }

  private snapshotKey(snapshotId: number): string {
    return `${this.prefix}:snapshot:${snapshotId}`;
  }

  private snapshotPagesKey(snapshotId: number): string {
    return `${this.prefix}:snapshot-pages:${snapshotId}`;
  }

  private snapshotOrderKey(): string {
    return `${this.prefix}:snapshots`;
  }

  private snapshotSequenceKey(): string {
    return `${this.prefix}:sequence:snapshot`;
  }

  private profileSequenceKey(): string {
    return `${this.prefix}:sequence:profile`;
  }

  private async ensureConnected(): Promise<void> {
    if (!this.ownsClient) {
      return;
    }
    if (this.redis.status === 'ready' || this.redis.status === 'connecting') {
      return;
    }
    await this.redis.connect();
  }

  async createSnapshot(params: CompanyIntelSnapshotCreateParams): Promise<CompanyIntelSnapshotRecord> {
    await this.ensureConnected();
    const id = await this.redis.incr(this.snapshotSequenceKey());
    const now = new Date();

    const record: CompanyIntelSnapshotRecord = {
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
      createdAt: now,
      completedAt: null,
    } satisfies CompanyIntelSnapshotRecord;

    const payload = JSON.stringify(serializeSnapshot(record));

    await this.redis
      .multi()
      .set(this.snapshotKey(id), payload)
      .lpush(this.snapshotOrderKey(), id.toString())
      .exec();

    await this.redis.del(this.snapshotPagesKey(id));

    this.log.debug('persistence:redis:snapshot:create', {
      snapshotId: id,
      domain: record.domain,
    });

    return record;
  }

  async updateSnapshot(snapshotId: number, updates: CompanyIntelSnapshotUpdate): Promise<void> {
    await this.ensureConnected();
    const existingRaw = await this.redis.get(this.snapshotKey(snapshotId));
    if (!existingRaw) {
      throw new Error(`Snapshot ${snapshotId} not found in redis persistence`);
    }

    const existing = deserializeSnapshot(JSON.parse(existingRaw) as PersistedSnapshotRecord);
    const next: CompanyIntelSnapshotRecord = {
      ...existing,
      status: updates.status ?? existing.status,
      domain: updates.domain ?? existing.domain,
      selectedUrls: updates.selectedUrls !== undefined ? [...updates.selectedUrls] : existing.selectedUrls,
      mapPayload: updates.mapPayload ?? existing.mapPayload,
      summaries: updates.summaries ?? existing.summaries,
      rawScrapes: updates.rawScrapes ?? existing.rawScrapes,
      error: updates.error ?? existing.error,
      vectorStoreId: updates.vectorStoreId === undefined ? existing.vectorStoreId ?? null : updates.vectorStoreId,
      vectorStoreStatus: updates.vectorStoreStatus ?? existing.vectorStoreStatus ?? 'pending',
      vectorStoreError: updates.vectorStoreError === undefined ? existing.vectorStoreError ?? null : updates.vectorStoreError,
      vectorStoreFileCounts: updates.vectorStoreFileCounts === undefined
        ? existing.vectorStoreFileCounts ?? null
        : updates.vectorStoreFileCounts,
      progress: updates.progress === undefined
        ? existing.progress ?? null
        : updates.progress
            ? {
                stage: updates.progress.stage,
                completed: updates.progress.completed,
                total: updates.progress.total,
                updatedAt: updates.progress.updatedAt ?? new Date(),
              }
            : null,
      completedAt: updates.completedAt !== undefined
        ? updates.completedAt
          ? new Date(updates.completedAt)
          : null
        : existing.completedAt,
    } satisfies CompanyIntelSnapshotRecord;

    await this.redis.set(this.snapshotKey(snapshotId), JSON.stringify(serializeSnapshot(next)));

    this.log.debug('persistence:redis:snapshot:update', {
      snapshotId,
      status: next.status,
    });
  }

  async replaceSnapshotPages(snapshotId: number, pages: readonly CompanyIntelPageInsert[]): Promise<void> {
    await this.ensureConnected();
    const payload: PersistedSnapshotPages = {
      pages: pages.map(page => ({ ...page, metadata: { ...page.metadata } })),
    };
    await this.redis.set(this.snapshotPagesKey(snapshotId), JSON.stringify(payload));

    this.log.debug('persistence:redis:snapshot:pages', {
      snapshotId,
      pageCount: pages.length,
    });
  }

  async upsertProfile(params: CompanyIntelProfileUpsert): Promise<CompanyIntelProfileRecord> {
    await this.ensureConnected();
    const profileKey = this.profileKey();
    const existingRaw = await this.redis.get(profileKey);
    const now = new Date();

    const existing = existingRaw ? deserializeProfile(JSON.parse(existingRaw) as PersistedProfileRecord) : null;

    const profile: CompanyIntelProfileRecord = {
      id: existing?.id ?? (await this.redis.incr(this.profileSequenceKey())),
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
      activeSnapshotId: params.activeSnapshotId,
      activeSnapshotStartedAt: params.activeSnapshotStartedAt,
      lastRefreshedAt: params.lastRefreshedAt,
      lastError: params.lastError,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    } satisfies CompanyIntelProfileRecord;

    await this.redis.set(profileKey, JSON.stringify(serializeProfile(profile)));

    this.log.debug('persistence:redis:profile:upsert', {
      profileId: profile.id,
      domain: profile.domain,
    });

    return profile;
  }

  async listSnapshots(params: { readonly limit?: number } = {}): Promise<readonly CompanyIntelSnapshotRecord[]> {
    await this.ensureConnected();
    const { limit } = params;
    const listKey = this.snapshotOrderKey();
    const end = typeof limit === 'number' ? Math.max(limit - 1, 0) : -1;
    const snapshotIds = await this.redis.lrange(listKey, 0, end);

    if (snapshotIds.length === 0) {
      return [];
    }

    const keys = snapshotIds
      .map(id => Number.parseInt(id, 10))
      .filter((value): value is number => Number.isFinite(value))
      .map(id => this.snapshotKey(id));

    const payloads = await this.redis.mget(keys);

    return payloads
      .filter((value): value is string => typeof value === 'string')
      .map(value => deserializeSnapshot(JSON.parse(value) as PersistedSnapshotRecord));
  }

  async getProfile(): Promise<CompanyIntelProfileRecord | null> {
    await this.ensureConnected();
    const payload = await this.redis.get(this.profileKey());
    if (!payload) {
      return null;
    }
    return deserializeProfile(JSON.parse(payload) as PersistedProfileRecord);
  }

  async getSnapshotById(snapshotId: number): Promise<CompanyIntelSnapshotRecord | null> {
    await this.ensureConnected();
    const payload = await this.redis.get(this.snapshotKey(snapshotId));
    if (!payload) {
      return null;
    }
    return deserializeSnapshot(JSON.parse(payload) as PersistedSnapshotRecord);
  }

  async deleteSnapshot(snapshotId: number): Promise<void> {
    await this.ensureConnected();
    await this.redis
      .multi()
      .del(this.snapshotKey(snapshotId), this.snapshotPagesKey(snapshotId))
      .lrem(this.snapshotOrderKey(), 0, snapshotId.toString())
      .exec();

    this.log.debug('persistence:redis:snapshot:delete', {
      snapshotId,
    });
  }

  async getSnapshotPages(snapshotId: number): Promise<CompanyIntelPageInsert[] | null> {
    await this.ensureConnected();
    const payload = await this.redis.get(this.snapshotPagesKey(snapshotId));
    if (!payload) {
      return null;
    }
    const parsed = JSON.parse(payload) as PersistedSnapshotPages;
    return parsed.pages.map(page => ({ ...page, metadata: { ...page.metadata } }));
  }

  async disconnect(): Promise<void> {
    if (!this.ownsClient) {
      return;
    }
    await this.redis.quit();
  }
}

export function createRedisPersistence(options: RedisPersistenceOptions): RedisCompanyIntelPersistence {
  return new RedisCompanyIntelPersistence(options);
}
