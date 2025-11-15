import { describe, it, expect, vi } from 'vitest';
import type { CompanyIntelEnvironment } from '../../server/bootstrap';
import type {
  CompanyIntelProfileRecord,
  CompanyIntelSnapshotRecord,
  CompanyIntelPersistence,
} from '../../server/services/persistence';
import { handleCompanyIntelGet, handleCompanyIntelPatch, validateTriggerPayload } from '../companyIntelRest';
import type { CompanyIntelServer } from '../../server/bridge';
import type { CompanyIntelRunCoordinator } from '../../server/runtime/runCoordinator';
import type { OpenAIClientLike } from '../../server/agents/shared/openai';

const profileRecord: CompanyIntelProfileRecord = {
  id: 1,
  domain: 'acme.com',
  status: 'ready',
  companyName: 'Acme',
  tagline: 'Tag',
  overview: 'Overview',
  valueProps: [],
  keyOfferings: [],
  primaryIndustries: [],
  faviconUrl: null,
  lastSnapshotId: null,
  activeSnapshotId: null,
  activeSnapshotStartedAt: null,
  lastRefreshedAt: null,
  lastError: null,
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-01T00:00:00Z'),
};

const snapshotRecord: CompanyIntelSnapshotRecord = {
  id: 42,
  status: 'complete',
  domain: 'acme.com',
  selectedUrls: [],
  mapPayload: null,
  summaries: null,
  rawScrapes: null,
  error: null,
  vectorStoreId: null,
  vectorStoreStatus: 'pending',
  vectorStoreError: null,
  vectorStoreFileCounts: null,
  progress: null,
  createdAt: new Date('2024-01-02T00:00:00Z'),
  completedAt: new Date('2024-01-02T00:10:00Z'),
};

function createEnv(overrides: Partial<CompanyIntelEnvironment>): CompanyIntelEnvironment {
  return {
    server: overrides.server ?? ({} as CompanyIntelServer),
    persistence: overrides.persistence ?? ({} as CompanyIntelPersistence),
    runtime: overrides.runtime ?? ({} as CompanyIntelRunCoordinator),
    openAI: overrides.openAI ?? ({} as OpenAIClientLike),
    chatModel: overrides.chatModel ?? 'gpt-5.1',
    chatReasoningEffort: overrides.chatReasoningEffort ?? 'low',
  };
}

function createServerMock(overrides: Partial<CompanyIntelServer> = {}): CompanyIntelServer {
  const asyncFn = () => vi.fn().mockResolvedValue(null);
  return {
    preview: asyncFn(),
    runCollection: asyncFn(),
    updateProfile: asyncFn(),
    getProfile: asyncFn(),
    getSnapshotHistory: asyncFn(),
    getSnapshotById: asyncFn(),
    generateSnapshotPdf: asyncFn(),
    ...overrides,
  } as CompanyIntelServer;
}

describe('companyIntelRest handlers', () => {
  it('returns profile + snapshots on GET', async () => {
    const server = createServerMock({
      getProfile: vi.fn().mockResolvedValue(profileRecord),
      getSnapshotHistory: vi.fn().mockResolvedValue([snapshotRecord]),
    });

    const result = await handleCompanyIntelGet(createEnv({ server }), { limit: 5 });

    expect(result.status).toBe(200);
    expect(server.getSnapshotHistory).toHaveBeenCalledWith(5);
    expect(result.body).toMatchObject({ data: { profile: { companyName: 'Acme' }, snapshots: expect.any(Array) } });
  });

  it('validates PATCH payloads', async () => {
    const env = createEnv({
      server: createServerMock({
        updateProfile: vi.fn().mockResolvedValue(profileRecord),
      }),
    });
    const bad = await handleCompanyIntelPatch(env, null);
    expect(bad.status).toBe(400);
  });

  it('validates trigger payloads', () => {
    const invalid = validateTriggerPayload({ foo: 'bar' });
    expect(invalid.ok).toBe(false);

    const valid = validateTriggerPayload({ domain: ' acme.com ', options: { maxPages: 5 } });
    expect(valid.ok).toBe(true);
    expect(valid).toMatchObject({ payload: { domain: 'acme.com' } });
  });
});
