// ------------------------------------------------------------------------------------------------
//                postgres.ts - Postgres-backed persistence implementation (Drizzle + postgres.js)
// ------------------------------------------------------------------------------------------------

import postgres, { type Sql } from 'postgres';
import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { desc, eq } from 'drizzle-orm';

import { logger as defaultLogger, type Logger } from '../../config/logging';
import type {
  CompanyIntelPersistence,
  CompanyIntelProfileRecord,
  CompanyIntelProfileUpsert,
  CompanyIntelSnapshotCreateParams,
  CompanyIntelSnapshotRecord,
  CompanyIntelSnapshotUpdate,
  CompanyIntelPageInsert,
  CompanyIntelSnapshotVectorStoreFileCounts,
} from '../services/persistence';
import type { CompanyProfileKeyOffering } from '../../shared/types';
import * as schema from '../../../../../database/schema';
import type { CompanyProfileRow, CompanySnapshotRow } from '../../../../../database/schema';

type SnapshotProgressUpdate = NonNullable<CompanyIntelSnapshotUpdate['progress']>;

export interface PostgresPersistenceOptions {
  readonly url?: string;
  readonly client?: Sql;
  readonly logger?: Logger;
}

function ensurePostgresClient(options: PostgresPersistenceOptions): Sql {
  if (options.client) {
    return options.client;
  }

  if (!options.url) {
    throw new Error('DATABASE_URL is required when client is not provided');
  }

  return postgres(options.url, {
    max: 5,
    idle_timeout: 5,
  });
}

function normaliseVectorStoreCounts(value: unknown): CompanyIntelSnapshotVectorStoreFileCounts | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const source = value as Partial<Record<keyof CompanyIntelSnapshotVectorStoreFileCounts, unknown>>;
  const toNumber = (input: unknown) => (typeof input === 'number' ? input : Number(input ?? 0)) || 0;

  return {
    inProgress: toNumber(source.inProgress),
    completed: toNumber(source.completed),
    failed: toNumber(source.failed),
    cancelled: toNumber(source.cancelled),
    total: toNumber(source.total),
  } satisfies CompanyIntelSnapshotVectorStoreFileCounts;
}

function normaliseValueProps(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string') : [];
}

function normaliseKeyOfferings(value: unknown): CompanyProfileKeyOffering[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.map(item => ({
    ...(typeof item?.title === 'string' ? { title: item.title } : { title: '' }),
    ...(typeof item?.description === 'string' ? { description: item.description } : {}),
  }));
}

function mapProfileRow(row: CompanyProfileRow): CompanyIntelProfileRecord {
  return {
    id: row.id,
    domain: row.domain ?? null,
    status: row.status,
    companyName: row.companyName ?? null,
    tagline: row.tagline ?? null,
    overview: row.overview ?? null,
    valueProps: normaliseValueProps(row.valueProps),
    keyOfferings: normaliseKeyOfferings(row.keyOfferings),
    primaryIndustries: normaliseValueProps(row.primaryIndustries),
    faviconUrl: row.faviconUrl ?? null,
    lastSnapshotId: row.lastSnapshotId ?? null,
    activeSnapshotId: row.activeSnapshotId ?? null,
    activeSnapshotStartedAt: row.activeSnapshotStartedAt ?? null,
    lastRefreshedAt: row.lastRefreshedAt ?? null,
    lastError: row.lastError ?? null,
    createdAt: row.createdAt ?? new Date(),
    updatedAt: row.updatedAt ?? new Date(),
  } satisfies CompanyIntelProfileRecord;
}

function mapSnapshotRow(row: CompanySnapshotRow): CompanyIntelSnapshotRecord {
  const progressStage = row.progressStage ?? null;
  const selectedUrls = Array.isArray(row.selectedUrls)
    ? [...row.selectedUrls]
    : null;

  return {
    id: row.id,
    status: row.status,
    domain: row.domain ?? null,
    selectedUrls,
    mapPayload: row.mapPayload ?? null,
    summaries: row.summaries ?? null,
    rawScrapes: row.rawScrapes ?? null,
    error: row.error ?? null,
    vectorStoreId: row.vectorStoreId ?? null,
    vectorStoreStatus: row.vectorStoreStatus,
    vectorStoreError: row.vectorStoreError ?? null,
    vectorStoreFileCounts: normaliseVectorStoreCounts(row.vectorStoreFileCounts),
    progress: progressStage
      ? {
          stage: progressStage,
          completed: row.progressCompleted ?? undefined,
          total: row.progressTotal ?? undefined,
          updatedAt: row.progressUpdatedAt ?? row.createdAt ?? new Date(),
        }
      : null,
    createdAt: row.createdAt ?? new Date(),
    completedAt: row.completedAt ?? null,
  } satisfies CompanyIntelSnapshotRecord;
}

function buildSnapshotUpdate(updates: CompanyIntelSnapshotUpdate): Partial<typeof schema.companySnapshots.$inferInsert> {
  const payload: Partial<typeof schema.companySnapshots.$inferInsert> = {};

  if (updates.status !== undefined) {
    payload.status = updates.status;
  }
  if (updates.domain !== undefined) {
    payload.domain = updates.domain;
  }
  if (updates.selectedUrls !== undefined) {
    payload.selectedUrls = [...updates.selectedUrls];
  }
  if (updates.mapPayload !== undefined) {
    payload.mapPayload = updates.mapPayload as never;
  }
  if (updates.summaries !== undefined) {
    payload.summaries = updates.summaries as never;
  }
  if (updates.rawScrapes !== undefined) {
    payload.rawScrapes = updates.rawScrapes as never;
  }
  if (updates.error !== undefined) {
    payload.error = updates.error;
  }
  if (updates.vectorStoreId !== undefined) {
    payload.vectorStoreId = updates.vectorStoreId;
  }
  if (updates.vectorStoreStatus !== undefined) {
    payload.vectorStoreStatus = updates.vectorStoreStatus;
  }
  if (updates.vectorStoreError !== undefined) {
    payload.vectorStoreError = updates.vectorStoreError;
  }
  if (updates.vectorStoreFileCounts !== undefined) {
    payload.vectorStoreFileCounts = updates.vectorStoreFileCounts as never;
  }
  if (updates.completedAt !== undefined) {
    payload.completedAt = updates.completedAt;
  }
  if (updates.progress !== undefined) {
    const progressUpdate = updates.progress as SnapshotProgressUpdate | null | undefined;
    if (progressUpdate == null) {
      payload.progressStage = null;
      payload.progressCompleted = null;
      payload.progressTotal = null;
      payload.progressUpdatedAt = null;
    } else {
      payload.progressStage = progressUpdate.stage;
      payload.progressCompleted = progressUpdate.completed ?? null;
      payload.progressTotal = progressUpdate.total ?? null;
      payload.progressUpdatedAt = (progressUpdate as SnapshotProgressUpdate & { updatedAt?: Date }).updatedAt ?? new Date();
    }
  }

  return payload;
}

const PROFILE_SINGLETON_ID = 1;

export class PostgresCompanyIntelPersistence implements CompanyIntelPersistence {
  private readonly log: Logger;
  private readonly client: Sql;
  private readonly db: PostgresJsDatabase<typeof schema>;

  constructor(options: PostgresPersistenceOptions = {}) {
    this.client = ensurePostgresClient(options);
    this.db = drizzle(this.client, { schema });
    this.log = options.logger ?? defaultLogger;
  }

  async createSnapshot(params: CompanyIntelSnapshotCreateParams): Promise<CompanyIntelSnapshotRecord> {
    const progress = params.progress ?? null;
    const progressUpdatedAt = progress ? new Date() : null;

    const [row] = await this.db
      .insert(schema.companySnapshots)
      .values({
        domain: params.domain ?? null,
        status: params.status ?? 'running',
        selectedUrls: null,
        vectorStoreStatus: params.vectorStoreStatus ?? 'pending',
        progressStage: progress?.stage ?? null,
        progressCompleted: progress?.completed ?? null,
        progressTotal: progress?.total ?? null,
        progressUpdatedAt,
      })
      .returning();

    this.log.debug('persistence:postgres:snapshot:create', {
      snapshotId: row.id,
      domain: row.domain,
    });

    return mapSnapshotRow(row);
  }

  async updateSnapshot(snapshotId: number, updates: CompanyIntelSnapshotUpdate): Promise<void> {
    const payload = buildSnapshotUpdate(updates);

    if (Object.keys(payload).length === 0) {
      return;
    }

    const result = await this.db
      .update(schema.companySnapshots)
      .set(payload)
      .where(eq(schema.companySnapshots.id, snapshotId))
      .returning({ id: schema.companySnapshots.id });

    if (result.length === 0) {
      throw new Error(`Snapshot ${snapshotId} not found in postgres persistence`);
    }

    this.log.debug('persistence:postgres:snapshot:update', { snapshotId, keys: Object.keys(payload) });
  }

  async replaceSnapshotPages(snapshotId: number, pages: readonly CompanyIntelPageInsert[]): Promise<void> {
    await this.db.transaction(async tx => {
      await tx.delete(schema.companySnapshotPages).where(eq(schema.companySnapshotPages.snapshotId, snapshotId));

      if (pages.length === 0) {
        return;
      }

      await tx.insert(schema.companySnapshotPages).values(
        pages.map(page => ({
          snapshotId,
          url: page.url,
          contentType: page.contentType,
          markdown: page.markdown,
          html: page.html,
          metadata: page.metadata,
          wordCount: page.wordCount ?? null,
          scrapedAt: page.scrapedAt,
          createdAt: page.createdAt,
        })),
      );
    });

    this.log.debug('persistence:postgres:snapshot:pages', { snapshotId, pageCount: pages.length });
  }

  async upsertProfile(params: CompanyIntelProfileUpsert): Promise<CompanyIntelProfileRecord> {
    const now = new Date();
    const basePayload = {
      domain: params.domain,
      status: params.status,
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
      lastRefreshedAt: params.lastRefreshedAt ?? null,
      lastError: params.lastError ?? null,
    } satisfies Omit<typeof schema.companyProfiles.$inferInsert, 'id' | 'createdAt' | 'updatedAt'>;

    const insertValues = {
      id: PROFILE_SINGLETON_ID,
      ...basePayload,
      createdAt: now,
      updatedAt: now,
    } satisfies typeof schema.companyProfiles.$inferInsert;

    const updateValues: Partial<typeof schema.companyProfiles.$inferInsert> = {
      ...basePayload,
      updatedAt: now,
    };

    if (params.lastRefreshedAt === undefined) {
      delete updateValues.lastRefreshedAt;
    }

    const [row] = await this.db
      .insert(schema.companyProfiles)
      .values(insertValues)
      .onConflictDoUpdate({
        target: schema.companyProfiles.id,
        set: updateValues,
      })
      .returning();

    this.log.debug('persistence:postgres:profile:upsert', { profileId: row.id });
    return mapProfileRow(row);
  }

  async listSnapshots(params?: { readonly limit?: number | undefined }): Promise<readonly CompanyIntelSnapshotRecord[]> {
    const query = this.db
      .select()
      .from(schema.companySnapshots)
      .orderBy(desc(schema.companySnapshots.createdAt));

    const limit = params?.limit !== undefined && params.limit > 0 ? Math.min(params.limit, 100) : null;
    const rows = limit ? await query.limit(limit) : await query;

    return rows.map(mapSnapshotRow);
  }

  async getProfile(): Promise<CompanyIntelProfileRecord | null> {
    const row = await this.db.query.companyProfiles.findFirst();
    return row ? mapProfileRow(row) : null;
  }

  async getSnapshotById(snapshotId: number): Promise<CompanyIntelSnapshotRecord | null> {
    const row = await this.db.query.companySnapshots.findFirst({
      where: eq(schema.companySnapshots.id, snapshotId),
    });
    return row ? mapSnapshotRow(row) : null;
  }

  async deleteSnapshot(snapshotId: number): Promise<void> {
    await this.db.delete(schema.companySnapshots).where(eq(schema.companySnapshots.id, snapshotId));
    this.log.debug('persistence:postgres:snapshot:delete', { snapshotId });
  }
}

export function createPostgresPersistence(options: PostgresPersistenceOptions = {}): PostgresCompanyIntelPersistence {
  return new PostgresCompanyIntelPersistence(options);
}
