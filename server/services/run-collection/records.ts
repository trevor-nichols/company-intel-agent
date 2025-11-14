// ------------------------------------------------------------------------------------------------
//                records.ts - Snapshot and profile accessors
// ------------------------------------------------------------------------------------------------

import type { CompanyIntelPersistence } from '../persistence';

export async function getCompanyIntelSnapshotHistory(
  persistence: CompanyIntelPersistence,
  limit = 5,
) {
  return persistence.listSnapshots({ limit });
}

export async function getCompanyIntelSnapshotById(
  persistence: CompanyIntelPersistence,
  snapshotId: number,
) {
  return persistence.getSnapshotById(snapshotId);
}

export function getCompanyIntelProfile(
  persistence: CompanyIntelPersistence,
) {
  return persistence.getProfile();
}
