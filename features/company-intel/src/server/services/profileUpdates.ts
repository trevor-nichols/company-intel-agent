// ------------------------------------------------------------------------------------------------
//                profileUpdates.ts - Helpers for manual company intel profile adjustments
// ------------------------------------------------------------------------------------------------

import { logger as defaultLogger } from '@company-intel/logging';

import type { CompanyProfileKeyOffering } from '../../shared/types';
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
  const currentStatus = currentProfile?.status ?? 'not_configured';
  const nextStatus =
    currentStatus === 'refreshing'
      ? 'refreshing'
      : (updates.companyName ?? updates.tagline ?? updates.overview ?? updates.primaryIndustries ?? updates.valueProps ?? updates.keyOfferings)
          ? 'ready'
          : currentStatus === 'not_configured'
            ? 'ready'
            : currentStatus;

  const payload: CompanyIntelProfileUpsert = {
    domain: currentProfile?.domain ?? null,
    status: nextStatus,
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
    activeSnapshotId: currentProfile?.activeSnapshotId ?? null,
    activeSnapshotStartedAt: currentProfile?.activeSnapshotStartedAt ?? null,
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
