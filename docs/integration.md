# Company-Intel Feature Integration Guide

This document explains how to drop the feature package into another app. Everything ships inside the workspace package `@company-intel/feature` so you can import UI, server primitives, and API handlers without copying the demo app.

## 1. Install / Link the Package

Inside this monorepo the package already exists. In another project you can consume it via npm, a tarball, or a workspace link:

| Distribution | Install Command | Notes |
| --- | --- | --- |
| npm (public) | `pnpm add @company-intel/feature` | Recommended once the package is published. |
| Tarball | `pnpm add ./company-intel-feature-X.Y.Z.tgz` | Generate via `pnpm pack --filter @company-intel/feature`. |
| Workspace | `"@company-intel/feature": "workspace:*"` | For multi-package repos consuming the feature directly. |

## 2. Environment & Bootstrap

Configure the feature once at process start so env/secret loading and logging are explicit. You can point it at `process.env`, a framework-specific config object, or a custom getter for serverless runtimes.

```ts
import { configureCompanyIntelFeature, createLogger } from '@company-intel/feature/config';
import { createCompanyIntelEnvironment } from '@company-intel/server/bootstrap';

configureCompanyIntelFeature({
  env: process.env,
  logger: createLogger({ service: 'acme-app' }),
});

const { server, runtime, persistence } = createCompanyIntelEnvironment({
  redisUrl: process.env.REDIS_URL,
  databaseUrl: process.env.DATABASE_URL,
  persistenceBackend:
    process.env.PERSISTENCE_BACKEND === 'postgres'
      ? 'postgres'
      : process.env.PERSISTENCE_BACKEND === 'redis'
        ? 'redis'
        : process.env.PERSISTENCE_BACKEND === 'memory'
          ? 'memory'
          : undefined,
});
```

For unit tests or multi-tenant hosts you can pass a scoped reader instead:

```ts
configureCompanyIntelEnv({
  OPENAI_API_KEY: testKey,
  TAVILY_API_KEY: testTavilyKey,
});
```

## 3. Mounting the REST APIs

Each handler returns an `HttpResult`. You can convert it into a response in any framework.

```ts
import { handleCompanyIntelGet, handleCompanyIntelPatch } from '@company-intel/feature/api/companyIntelRest';
import { toNextResponse } from '@company-intel/feature/adapters/next/http';
import { getCompanyIntelEnvironment } from '@company-intel/server/bootstrap';

export async function GET(req: NextRequest) {
  const env = getCompanyIntelEnvironment();
  const result = await handleCompanyIntelGet(env, { limit: 10 });
  return toNextResponse(result);
}
```

Available handlers:

- `handleCompanyIntelGet`, `handleCompanyIntelPatch`
- `handleCompanyIntelPreview`
- `handleSnapshotDetail`, `handleSnapshotExport`
- `handleRunCancel`

See `features/company-intel/src/api/*.ts` for details.

## 4. Streaming (Runs + Chat)

### SSE for new runs

```ts
import { createRunStream } from '@company-intel/feature/api/runStream';
import { createSseResponse } from '@company-intel/feature/adapters/next/http';

export async function POST(req: NextRequest) {
  const data = await req.json();
  const validation = validateTriggerPayload(data);
  if (!validation.ok) return toNextResponse(validation.response);

  const env = getCompanyIntelEnvironment();
  const stream = await createRunStream(validation.payload, { runtime: env.runtime });
  if (!stream.ok) return toNextResponse(stream.response);
  return createSseResponse(stream.stream);
}
```

### SSE for existing runs

Use `createExistingRunStream(snapshotId, { runtime })` to reattach clients.

### Chat streaming

```ts
const env = getCompanyIntelEnvironment();
const result = await createChatStream(
  { snapshotId, body: requestBody },
  {
    persistence: env.persistence,
    openAI: env.openAI,
    chatModel: env.chatModel,
    chatReasoningEffort: env.chatReasoningEffort,
  },
  { signal: req.signal },
);
```

## 5. UI Embedding

Import `CompanyIntelProviders` and `CompanyIntelPanel` (or individual components) from `@company-intel/ui/company-intel` and mount them wherever you want. The provider accepts `apiBasePath`/`fetcher` overrides so you can point it at your own API host.

```tsx
import { CompanyIntelPanel, CompanyIntelProviders } from '@company-intel/ui/company-intel';

export function CompanyIntelPage() {
  return (
    <CompanyIntelProviders apiBasePath="/api/company-intel">
      <CompanyIntelPanel />
    </CompanyIntelProviders>
  );
}
```

## 6. SSE Contract

SSE events follow `shared/company-intel/types.ts`. Frames look like:

```
data: {"type":"status","stage":"mapping"}

...
data: [DONE]
```

Ensure you keep the headers listed in `AGENTS.md §8` when integrating with another HTTP stack.

**Persistence selection:**

- If both `DATABASE_URL` and `REDIS_URL` are set you should set `PERSISTENCE_BACKEND` (`postgres` | `redis` | `memory`) to make the choice explicit. Otherwise bootstrap logs a warning and defaults to Postgres.
- If only `DATABASE_URL` is set (and `PERSISTENCE_BACKEND` is unset) the feature uses the Postgres + Drizzle adapter.
- If only `REDIS_URL` is set (and `PERSISTENCE_BACKEND` is unset) the Redis adapter is used.
- Set `PERSISTENCE_BACKEND=memory` to force in-memory storage even when URLs are available.
- You can also inject a custom adapter via the `persistence` override when embedding the package.

## 7. Syncing Snapshots into Postgres / Downstream Systems

When Postgres is enabled, snapshots land in `company_profiles`, `company_snapshots`, and `company_snapshot_pages`. A simple worker can mirror those rows into your CRM or agent prompt store. To run the Postgres parity suite locally:

```bash
TEST_DATABASE_ALLOW_DROP=true pnpm test:postgres
```

The helper targets `postgres://companyintel:companyintel@localhost:5432/companyintel_test` by default and will refuse to run destructive setup unless `TEST_DATABASE_ALLOW_DROP=true` is present.

```ts
import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL!);
const lastSynced = Number(process.env.LAST_SYNCED_SNAPSHOT_ID ?? 0);
const ready = await sql`
  select id, summaries, vector_store_id
  from company_snapshots
  where status = 'complete' and id > ${lastSynced}
  order by id asc
`;

for (const snapshot of ready) {
  // hydrate downstream agents here
  process.env.LAST_SYNCED_SNAPSHOT_ID = String(snapshot.id);
}
```

Because the JSON payloads are already validated by Zod, you can map values like `summaries -> structuredProfile -> valueProps` directly into template variables (`{company_tagline}`, `{core_offerings}`, etc.). Mentioning this pipeline (“Company-Intel snapshots stream into Postgres via Drizzle and power downstream agents”) is a strong resume bullet.
