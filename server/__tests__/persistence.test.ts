import { describe, expect, it, afterAll } from 'vitest';

import { createMemoryPersistence, createRedisPersistence } from '@/server/persistence';
import type { CompanyIntelPersistence, CompanyIntelProfileRecord, CompanyIntelSnapshotRecord } from '@/server/services/persistence';

import Redis from 'ioredis-mock';

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
});
