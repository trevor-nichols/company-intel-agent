import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { CompanyIntelServer } from '@/server/bridge';
import { CompanyIntelRunCoordinator } from '@/server/runtime/runCoordinator';
import type { RunCompanyIntelCollectionParams, RunCompanyIntelCollectionResult } from '@/server/services/run-collection';
import type { CompanyIntelStreamEvent } from '@/shared/company-intel/types';

function createResult(snapshotId: number): RunCompanyIntelCollectionResult {
  return {
    snapshotId,
    status: 'complete',
    selections: [],
    totalLinksMapped: 0,
    successfulPages: 0,
    failedPages: 0,
  } satisfies RunCompanyIntelCollectionResult;
}

describe('CompanyIntelRunCoordinator', () => {
  let runCollectionMock: ReturnType<typeof vi.fn<CompanyIntelServer['runCollection']>>;
  let coordinator: CompanyIntelRunCoordinator;

  beforeEach(() => {
    runCollectionMock = vi.fn<CompanyIntelServer['runCollection']>();

    const server: CompanyIntelServer = {
      preview: vi.fn(),
      runCollection: runCollectionMock,
      updateProfile: vi.fn(),
      getProfile: vi.fn(),
      getSnapshotHistory: vi.fn(),
      getSnapshotById: vi.fn(),
      generateSnapshotPdf: vi.fn(),
    };

    coordinator = new CompanyIntelRunCoordinator({ server });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('allows a fresh run to start immediately after a completed session for the same domain', async () => {
    let invocation = 0;

    runCollectionMock.mockImplementation(async (params: RunCompanyIntelCollectionParams, overrides) => {
      invocation += 1;
      const snapshotId = invocation === 1 ? 101 : 202;

      queueMicrotask(() => {
        const snapshotCreated: CompanyIntelStreamEvent = {
          type: 'snapshot-created',
          snapshotId,
          domain: params.domain,
          status: 'running',
        };
        overrides?.onEvent?.(snapshotCreated);

        const completed: CompanyIntelStreamEvent = {
          type: 'run-complete',
          snapshotId,
          domain: params.domain,
          result: createResult(snapshotId),
        };
        overrides?.onEvent?.(completed);
      });

      return createResult(snapshotId);
    });

    const first = await coordinator.startRun({ domain: 'example.com' });
    expect(first.snapshotId).toBe(101);

    const second = await coordinator.startRun({ domain: 'example.com' });
    expect(second.snapshotId).toBe(202);

    expect(runCollectionMock).toHaveBeenCalledTimes(2);
    expect(coordinator.getActiveRunBySnapshot(first.snapshotId)).toBeNull();
  });
});
