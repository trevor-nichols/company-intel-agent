// ------------------------------------------------------------------------------------------------
//                initialise.ts - Snapshot bootstrap and run context creation
// ------------------------------------------------------------------------------------------------

import { logger as defaultLogger } from '@agenai/logging';

import type { CompanyIntelProfileRecord } from '../../persistence';
import { CompanyIntelRunCancelledError } from '../errors';
import { RunContext } from '../context';
import type {
  RunCompanyIntelCollectionParams,
  RunCompanyIntelCollectionDependencies,
} from '../types';

export interface PreviousProfileState {
  readonly snapshotId: number | null;
  readonly status: CompanyIntelProfileRecord['status'];
  readonly lastRefreshedAt: Date | null;
  readonly companyName: string | null;
  readonly tagline: string | null;
  readonly overview: string | null;
  readonly valueProps: readonly string[];
  readonly keyOfferings: CompanyIntelProfileRecord['keyOfferings'];
  readonly primaryIndustries: readonly string[];
  readonly faviconUrl: string | null;
  readonly lastError: string | null;
}

export interface InitialiseRunResult {
  readonly context: RunContext;
  readonly normalizedDomain: string;
  readonly runStartedAt: Date;
  readonly existingProfile: CompanyIntelProfileRecord | null;
  readonly previousProfileState: PreviousProfileState;
}

export async function initialiseRun(
  params: RunCompanyIntelCollectionParams,
  dependencies: RunCompanyIntelCollectionDependencies,
): Promise<InitialiseRunResult> {
  const log = dependencies.logger ?? defaultLogger;
  const { persistence, abortSignal } = dependencies;

  if (abortSignal?.aborted) {
    const reason = typeof abortSignal.reason === 'string' && abortSignal.reason.length > 0
      ? abortSignal.reason
      : 'Run cancelled by user';
    throw new CompanyIntelRunCancelledError(reason);
  }

  const runStartedAt = new Date();
  const existingProfile = await persistence.getProfile();

  const normalizedDomain = params.domain.trim().length > 0
    ? params.domain.trim()
    : existingProfile?.domain ?? params.domain;

  const previousProfileState: PreviousProfileState = {
    snapshotId: existingProfile?.lastSnapshotId ?? null,
    status: existingProfile?.status ?? 'not_configured',
    lastRefreshedAt: existingProfile?.lastRefreshedAt ?? null,
    companyName: existingProfile?.companyName ?? null,
    tagline: existingProfile?.tagline ?? null,
    overview: existingProfile?.overview ?? null,
    valueProps: existingProfile?.valueProps ?? [],
    keyOfferings: existingProfile?.keyOfferings ?? [],
    primaryIndustries: existingProfile?.primaryIndustries ?? [],
    faviconUrl: existingProfile?.faviconUrl ?? null,
    lastError: existingProfile?.lastError ?? null,
  } satisfies PreviousProfileState;

  const snapshot = await persistence.createSnapshot({
    domain: normalizedDomain,
    status: 'running',
  });

  const context = new RunContext({
    logger: log,
    persistence,
    emit: dependencies.emit,
    abortSignal,
    snapshot,
    initialDomain: normalizedDomain,
  });

  await context.upsertProfile({
    domain: existingProfile?.domain ?? normalizedDomain,
    status: 'refreshing',
    companyName: previousProfileState.companyName,
    tagline: previousProfileState.tagline,
    overview: previousProfileState.overview,
    valueProps: [...previousProfileState.valueProps],
    keyOfferings: previousProfileState.keyOfferings.map(offering => ({ ...offering })),
    primaryIndustries: [...previousProfileState.primaryIndustries],
    faviconUrl: previousProfileState.faviconUrl,
    lastSnapshotId: previousProfileState.snapshotId,
    activeSnapshotId: snapshot.id,
    activeSnapshotStartedAt: runStartedAt,
    lastRefreshedAt: previousProfileState.lastRefreshedAt,
    lastError: null,
  });

  context.emitEvent({
    type: 'snapshot-created',
    status: snapshot.status,
  });

  return {
    context,
    normalizedDomain,
    runStartedAt,
    existingProfile,
    previousProfileState,
  } satisfies InitialiseRunResult;
}
