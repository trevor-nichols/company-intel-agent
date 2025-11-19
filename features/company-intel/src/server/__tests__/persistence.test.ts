import { describe, expect, it, afterAll } from 'vitest';
import path from 'node:path';

import { createMemoryPersistence, createRedisPersistence, createPostgresPersistence } from '../persistence';
import type { CompanyIntelPersistence, CompanyIntelProfileRecord, CompanyIntelSnapshotRecord } from '../services/persistence';

import Redis from 'ioredis-mock';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import * as schema from '../../../../../database/schema';

function normaliseSnapshot(record: CompanyIntelSnapshotRecord | null) {
  if (!record) {
    return null;
  }
  const normalizedCreatedAt = record.createdAt ? 'normalized' : null;
  const normalizedCompletedAt = record.completedAt ? 'normalized' : null;
  return {
    ...record,
    selectedUrls: record.selectedUrls ? [...record.selectedUrls] : null,
    createdAt: normalizedCreatedAt,
    completedAt: normalizedCompletedAt,
    createdAtIso: normalizedCreatedAt,
    completedAtIso: normalizedCompletedAt,
  } satisfies Record<string, unknown>;
}

function normaliseProfile(record: CompanyIntelProfileRecord | null) {
  if (!record) {
    return null;
  }
  const createdAtIso = record.createdAt ? 'normalized' : null;
  const updatedAtIso = record.updatedAt ? 'normalized' : null;
  const lastRefreshedAtIso = record.lastRefreshedAt ? 'normalized' : null;
  return {
    ...record,
    valueProps: [...record.valueProps],
    keyOfferings: record.keyOfferings.map(offering => ({ ...offering })),
    primaryIndustries: [...record.primaryIndustries],
    createdAt: createdAtIso,
    createdAtIso,
    updatedAt: updatedAtIso,
    updatedAtIso,
    lastRefreshedAt: lastRefreshedAtIso,
    lastRefreshedAtIso,
  } satisfies Record<string, unknown>;
}

async function exercisePersistence(persistence: CompanyIntelPersistence) {
  const snapshot = await persistence.createSnapshot({ domain: 'example.com' });
  const completedAt = new Date('2025-01-01T00:30:00.000Z');

  await persistence.updateSnapshot(snapshot.id, {
    status: 'complete',
    selectedUrls: ['https://example.com/about'],
    summaries: { overview: 'Great company' },
    completedAt,
  });

  await persistence.updateSnapshot(snapshot.id, {
    selectedUrls: [],
  });

  await persistence.replaceSnapshotPages(snapshot.id, [
    {
      url: 'https://example.com/about',
      contentType: 'markdown',
      markdown: '# About Example',
      html: null,
      metadata: { language: 'en' },
      wordCount: 250,
      scrapedAt: completedAt,
      createdAt: completedAt,
    },
  ]);

  await persistence.upsertProfile({
    domain: 'example.com',
    status: 'ready',
    companyName: 'Example Co',
    tagline: 'Demo tagline',
    overview: 'Overview',
    valueProps: ['Value 1', 'Value 2'],
    keyOfferings: [{ title: 'Offering', description: 'Details' }],
    primaryIndustries: ['Software'],
    faviconUrl: 'https://example.com/favicon.ico',
    lastSnapshotId: snapshot.id,
    activeSnapshotId: null,
    activeSnapshotStartedAt: null,
    lastRefreshedAt: completedAt,
    lastError: null,
  });

  return {
    snapshot: normaliseSnapshot(await persistence.getSnapshotById(snapshot.id)),
    snapshots: (await persistence.listSnapshots({ limit: 5 })).map(normaliseSnapshot),
    profile: normaliseProfile(await persistence.getProfile()),
  };
}

describe('CompanyIntelPersistence implementations', () => {
  const redisClient = new Redis();

  afterAll(async () => {
    await redisClient.quit();
  });

  it('memory and redis implementations behave equivalently', async () => {
    const memory = createMemoryPersistence();
    const redis = createRedisPersistence({ redis: redisClient });

    const memoryResult = await exercisePersistence(memory);
    const redisResult = await exercisePersistence(redis);

    expect(redisResult).toEqual(memoryResult);
  });

  const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;

  if (TEST_DATABASE_URL) {
    it(
      'memory and postgres implementations behave equivalently',
      async () => {
        const { persistence, sql } = await createPostgresTestPersistence(TEST_DATABASE_URL);
        try {
          const memory = createMemoryPersistence();
          const memoryResult = await exercisePersistence(memory);
          const postgresResult = await exercisePersistence(persistence);

          expect(postgresResult).toEqual(memoryResult);
        } finally {
          await sql.end({ timeout: 1 });
        }
      },
      60_000,
    );
  } else {
    it.skip('memory and postgres implementations behave equivalently (set TEST_DATABASE_URL)', () => {});
  }

  it('updateSnapshot throws when snapshot is missing (memory)', async () => {
    const memory = createMemoryPersistence();
    await expect(memory.updateSnapshot(9999, { status: 'failed' })).rejects.toThrow('Snapshot 9999');
  });

  it('updateSnapshot throws when snapshot is missing (redis)', async () => {
    const redis = createRedisPersistence({ redis: redisClient });
    await expect(redis.updateSnapshot(9999, { status: 'failed' })).rejects.toThrow('Snapshot 9999');
  });

  if (TEST_DATABASE_URL) {
    it('updateSnapshot throws when snapshot is missing (postgres)', async () => {
      const { persistence, sql } = await createPostgresTestPersistence(TEST_DATABASE_URL);
      try {
        await expect(persistence.updateSnapshot(9999, { status: 'failed' })).rejects.toThrow('Snapshot 9999');
      } finally {
        await sql.end({ timeout: 1 });
      }
    });
  } else {
    it.skip('updateSnapshot throws when snapshot is missing (postgres) (set TEST_DATABASE_URL)', () => {});
  }
});

async function createPostgresTestPersistence(databaseUrl: string) {
  const sql = postgres(databaseUrl, { max: 1 });

  const url = new URL(databaseUrl);
  const host = url.hostname?.toLowerCase();
  const isLocalHost = host === 'localhost' || host === '127.0.0.1';
  const allowDrop = process.env.TEST_DATABASE_ALLOW_DROP === 'true';
  const dbName = url.pathname.replace(/^\//, '');
  const isTestDbName = dbName === 'companyintel_test' || dbName === 'companyintel-test' || dbName.endsWith('_test') || dbName.endsWith('-test');

  if (!allowDrop) {
    await sql.end({ timeout: 1 });
    throw new Error(
      'Destructive Postgres test setup requires TEST_DATABASE_ALLOW_DROP=true and a throwaway DB (local, name ending in "_test" or "-test"). Set the env var to proceed.',
    );
  }

  if (!isLocalHost) {
    await sql.end({ timeout: 1 });
    throw new Error('TEST_DATABASE_ALLOW_DROP is set but host is not local; refusing to drop schemas.');
  }

  if (!isTestDbName) {
    await sql.end({ timeout: 1 });
    throw new Error('TEST_DATABASE_ALLOW_DROP is set but database name does not look like a throwaway test DB (expected *_test or -test).');
  }

  await sql`DROP SCHEMA IF EXISTS public CASCADE`;
  await sql`CREATE SCHEMA public`;
  await sql`DROP SCHEMA IF EXISTS drizzle CASCADE`;

  const db = drizzle(sql, { schema });
  await migrate(db, { migrationsFolder: path.join(process.cwd(), 'database/migrations') });

  const persistence = createPostgresPersistence({ client: sql });
  return { persistence, sql } as const;
}
