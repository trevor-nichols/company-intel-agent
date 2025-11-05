// ------------------------------------------------------------------------------------------------
//                redis.ts - Redis-backed persistence implementation
// ------------------------------------------------------------------------------------------------

import Redis, { type Redis as RedisClient } from 'ioredis';
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

type PersistedSnapshotRecord = Omit<CompanyIntelSnapshotRecord, 'createdAt' | 'completedAt'> & {
  readonly createdAtIso: string;
  readonly completedAtIso: string | null;
};

type PersistedProfileRecord = Omit<CompanyIntelProfileRecord, 'createdAt' | 'updatedAt' | 'lastRefreshedAt'> & {
  readonly createdAtIso: string;
  readonly updatedAtIso: string;
  readonly lastRefreshedAtIso: string | null;
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
    createdAtIso: record.createdAt ? record.createdAt.toISOString() : new Date().toISOString(),
    completedAtIso: record.completedAt ? record.completedAt.toISOString() : null,
  } satisfies PersistedSnapshotRecord;
}

function deserializeSnapshot(payload: PersistedSnapshotRecord): CompanyIntelSnapshotRecord {
  const { createdAtIso, completedAtIso, ...rest } = payload;
  return {
    ...rest,
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
  } satisfies PersistedProfileRecord;
}

function deserializeProfile(payload: PersistedProfileRecord): CompanyIntelProfileRecord {
  const { createdAtIso, updatedAtIso, lastRefreshedAtIso, ...rest } = payload;
  return {
    ...rest,
    valueProps: [...payload.valueProps],
    keyOfferings: payload.keyOfferings.map(offering => ({ ...offering })),
    primaryIndustries: [...payload.primaryIndustries],
    createdAt: new Date(createdAtIso),
    updatedAt: new Date(updatedAtIso),
    lastRefreshedAt: lastRefreshedAtIso ? new Date(lastRefreshedAtIso) : null,
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

  private profileKey(teamId: number): string {
    return `${this.prefix}:profile:${teamId}`;
  }

  private snapshotKey(snapshotId: number): string {
    return `${this.prefix}:snapshot:${snapshotId}`;
  }

  private snapshotPagesKey(snapshotId: number): string {
    return `${this.prefix}:snapshot-pages:${snapshotId}`;
  }

  private snapshotsByTeamKey(teamId: number): string {
    return `${this.prefix}:snapshots:byTeam:${teamId}`;
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
      teamId: params.teamId,
      status: params.status ?? 'pending',
      domain: params.domain ?? null,
      selectedUrls: null,
      mapPayload: null,
      summaries: null,
      rawScrapes: null,
      initiatedByUserId: params.initiatedByUserId ?? null,
      error: null,
      createdAt: now,
      completedAt: null,
    } satisfies CompanyIntelSnapshotRecord;

    const payload = JSON.stringify(serializeSnapshot(record));

    await this.redis
      .multi()
      .set(this.snapshotKey(id), payload)
      .lpush(this.snapshotsByTeamKey(params.teamId), id.toString())
      .exec();

    await this.redis.del(this.snapshotPagesKey(id));

    this.log.debug('persistence:redis:snapshot:create', {
      snapshotId: id,
      teamId: params.teamId,
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
    const profileKey = this.profileKey(params.teamId);
    const existingRaw = await this.redis.get(profileKey);
    const now = new Date();

    const existing = existingRaw ? deserializeProfile(JSON.parse(existingRaw) as PersistedProfileRecord) : null;

    const profile: CompanyIntelProfileRecord = {
      id: existing?.id ?? (await this.redis.incr(this.profileSequenceKey())),
      teamId: params.teamId,
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

    await this.redis.set(profileKey, JSON.stringify(serializeProfile(profile)));

    this.log.debug('persistence:redis:profile:upsert', {
      teamId: params.teamId,
      profileId: profile.id,
    });

    return profile;
  }

  async listSnapshots({ teamId, limit }: { readonly teamId: number; readonly limit?: number }): Promise<readonly CompanyIntelSnapshotRecord[]> {
    await this.ensureConnected();
    const listKey = this.snapshotsByTeamKey(teamId);
    const end = typeof limit === 'number' ? Math.max(limit - 1, 0) : -1;
    const snapshotIds = await this.redis.lrange(listKey, 0, end);

    if (snapshotIds.length === 0) {
      return [];
    }

    const payloads = await this.redis.mget(snapshotIds.map(id => this.snapshotKey(Number.parseInt(id, 10))));

    return payloads
      .filter((value): value is string => typeof value === 'string')
      .map(value => deserializeSnapshot(JSON.parse(value) as PersistedSnapshotRecord));
  }

  async getProfile(teamId: number): Promise<CompanyIntelProfileRecord | null> {
    await this.ensureConnected();
    const payload = await this.redis.get(this.profileKey(teamId));
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
