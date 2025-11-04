import { afterEach, describe, expect, it, vi } from 'vitest';

import type { CompanyIntelServer } from '@/server/bridge';

const updateProfileMock = vi.fn();

vi.mock('@/server/bootstrap', () => ({
  getCompanyIntelEnvironment: () => ({
    server: {
      updateProfile: updateProfileMock,
    } satisfies Pick<CompanyIntelServer, 'updateProfile'>,
  }),
}));

import { PATCH } from '@app/api/protected/onboarding/company-intel/route';
import { NextRequest } from 'next/server';

describe('Company intel PATCH route', () => {
  afterEach(() => {
    updateProfileMock.mockReset();
  });

  it('sanitises payloads before updating the profile', async () => {
    const now = new Date('2025-03-10T10:00:00.000Z');

    updateProfileMock.mockImplementation(async ({ updates }) => {
      expect(updates).toMatchObject({
        companyName: 'Example Inc',
        valueProps: ['Clarity'],
        primaryIndustries: ['FinTech'],
        keyOfferings: [{ title: 'Platform', description: 'Unified experience' }],
      });

      return {
        id: 1,
        teamId: 1,
        domain: 'example.com',
        status: 'ready',
        companyName: 'Example Inc',
        tagline: null,
        overview: null,
        valueProps: ['Clarity'],
        keyOfferings: [{ title: 'Platform', description: 'Unified experience' }],
        primaryIndustries: ['FinTech'],
        faviconUrl: null,
        lastSnapshotId: null,
        lastRefreshedAt: now,
        lastError: null,
        createdAt: now,
        updatedAt: now,
      };
    });

    const request = new NextRequest('http://localhost/api/protected/onboarding/company-intel', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        companyName: ' Example Inc ',
        valueProps: ['Clarity', 'clarity'],
        primaryIndustries: ['FinTech', '  '],
        keyOfferings: [
          { title: '  Platform ', description: 'Unified experience' },
          { title: '' },
        ],
      }),
    });

    const response = await PATCH(request);
    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.data).toMatchObject({
      companyName: 'Example Inc',
      valueProps: ['Clarity'],
      primaryIndustries: ['FinTech'],
      keyOfferings: [{ title: 'Platform', description: 'Unified experience' }],
    });

    expect(json.data.createdAt).toBe(now.toISOString());
  });
});
