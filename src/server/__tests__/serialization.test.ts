import { describe, expect, it } from 'vitest';

import { serializeProfile, serializeSnapshot } from '@/server/handlers/serialization';
import type { CompanyIntelProfileRecord, CompanyIntelSnapshotRecord } from '@/server/services/persistence';

describe('serialization helpers', () => {
  it('serialises profile records with ISO timestamps and cloned arrays', () => {
    const createdAt = new Date('2025-01-01T00:00:00.000Z');
    const updatedAt = new Date('2025-01-02T12:34:56.000Z');
    const lastRefreshedAt = new Date('2025-01-02T11:00:00.000Z');

    const profile: CompanyIntelProfileRecord = {
      id: 42,
      teamId: 7,
      domain: 'example.com',
      status: 'ready',
      companyName: 'Example Co',
      tagline: 'Do more with less',
      overview: 'Sample overview',
      valueProps: ['Speed', 'Reliability'],
      keyOfferings: [{ title: 'Widget', description: 'Best widget' }],
      primaryIndustries: ['Software'],
      faviconUrl: 'https://example.com/favicon.ico',
      lastSnapshotId: 101,
      lastRefreshedAt,
      lastError: null,
      createdAt,
      updatedAt,
    };

    const serialised = serializeProfile(profile);
    expect(serialised).toMatchObject({
      id: 42,
      teamId: 7,
      domain: 'example.com',
      status: 'ready',
      companyName: 'Example Co',
      valueProps: ['Speed', 'Reliability'],
      keyOfferings: [{ title: 'Widget', description: 'Best widget' }],
      createdAt: createdAt.toISOString(),
      updatedAt: updatedAt.toISOString(),
      lastRefreshedAt: lastRefreshedAt.toISOString(),
    });

    // Mutating the original arrays should not affect the serialised payload.
    const serialisedValueProps = serialised?.valueProps as string[];
    expect(serialisedValueProps).not.toBe(profile.valueProps);

  });

  it('serialises snapshot records with ISO timestamps and deep-cloned payloads', () => {
    const createdAt = new Date('2025-02-01T00:00:00.000Z');
    const completedAt = new Date('2025-02-01T00:30:00.000Z');

    const snapshot: CompanyIntelSnapshotRecord = {
      id: 55,
      teamId: 7,
      status: 'complete',
      domain: 'https://example.com',
      selectedUrls: ['https://example.com/about'],
      mapPayload: { links: ['https://example.com/about'] },
      summaries: { overview: 'Great company' },
      rawScrapes: [{ url: 'https://example.com/about', success: true, durationMs: 123 }],
      initiatedByUserId: 99,
      error: null,
      createdAt,
      completedAt,
    };

    const serialised = serializeSnapshot(snapshot);

    expect(serialised).toMatchObject({
      id: 55,
      teamId: 7,
      status: 'complete',
      domain: 'https://example.com',
      selectedUrls: ['https://example.com/about'],
      createdAt: createdAt.toISOString(),
      completedAt: completedAt.toISOString(),
    });

    // Ensure nested objects are cloned.
    (snapshot.mapPayload as { links: string[] }).links.push('https://example.com/contact');
    expect((serialised.mapPayload as { links: string[] }).links).toEqual(['https://example.com/about']);
  });
});
