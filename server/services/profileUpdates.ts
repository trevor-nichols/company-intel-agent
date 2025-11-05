// ------------------------------------------------------------------------------------------------
//                profileUpdates.ts - Helpers for manual company intel profile adjustments
// ------------------------------------------------------------------------------------------------

import { logger as defaultLogger } from '@agenai/logging';

import type { CompanyProfileKeyOffering } from '@/shared/company-intel/types';
import type { CompanyIntelPersistence, CompanyIntelProfileRecord, CompanyIntelProfileUpsert } from './persistence';

export interface UpdateCompanyIntelProfileParams {
  readonly updates: Partial<{
    companyName: string | null;
    tagline: string | null;
    overview: string | null;
    primaryIndustries: readonly string[];
    valueProps: readonly string[];
    keyOfferings: readonly CompanyProfileKeyOffering[];
  }>;
}

export interface UpdateCompanyIntelProfileDependencies {
  readonly persistence: CompanyIntelPersistence;
  readonly logger?: typeof defaultLogger;
}

export async function updateCompanyIntelProfile({
  updates,
}: UpdateCompanyIntelProfileParams, dependencies: UpdateCompanyIntelProfileDependencies): Promise<CompanyIntelProfileRecord> {
  const logger = dependencies.logger ?? defaultLogger;
  const currentProfile = await dependencies.persistence.getProfile();
  const now = new Date();

  const payload: CompanyIntelProfileUpsert = {
    domain: currentProfile?.domain ?? null,
    status: (updates.companyName ?? updates.tagline ?? updates.overview) ? 'ready' : (currentProfile?.status ?? 'ready'),
    companyName: updates.companyName !== undefined ? updates.companyName : currentProfile?.companyName ?? null,
    tagline: updates.tagline !== undefined ? updates.tagline : currentProfile?.tagline ?? null,
    overview: updates.overview !== undefined ? updates.overview : currentProfile?.overview ?? null,
    valueProps:
      updates.valueProps !== undefined
        ? [...updates.valueProps]
        : currentProfile?.valueProps ?? [],
    keyOfferings:
      updates.keyOfferings !== undefined
        ? [...updates.keyOfferings]
        : currentProfile?.keyOfferings ?? [],
    primaryIndustries:
      updates.primaryIndustries !== undefined
        ? [...updates.primaryIndustries]
        : currentProfile?.primaryIndustries ?? [],
    faviconUrl: currentProfile?.faviconUrl ?? null,
    lastSnapshotId: currentProfile?.lastSnapshotId ?? null,
    lastRefreshedAt: now,
    lastError: null,
  };

  const profile = await dependencies.persistence.upsertProfile(payload);

  logger.info('company-intel:profile:update', {
    fields: Object.keys(updates),
    domain: profile.domain,
  });

  return profile;
}
