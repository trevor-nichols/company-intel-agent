# Company-Intel Starter

An end-to-end Next.js starter that maps a company website, scrapes primary pages, generates structured intelligence with OpenAI Responses, streams progress over SSE, persists results, and exports polished PDFs. The project is designed for production readiness: strict TypeScript, deterministic contracts, optional Redis, and a demo UI you can drop into any onboarding flow.

## Quickstart

Prerequisites: Node.js ≥ 20.11, pnpm ≥ 9. Copy `.env.example` → `.env` and provide at least `OPENAI_API_KEY` and `TAVILY_API_KEY`.

```bash
pnpm install
pnpm dev
```

Visit `http://localhost:3000` to run the demo flow. By default the starter uses in-memory persistence; set `REDIS_URL` to enable Redis-backed storage.

## Environment

| Variable | Description | Default |
| --- | --- | --- |
| `OPENAI_API_KEY` | OpenAI Responses API key (used for structured profile + overview). | — |
| `TAVILY_API_KEY` | Tavily mapping/extraction key. | — |
| `OPENAI_MODEL_STRUCTURED` | Model for structured profile run. | `gpt-5` |
| `OPENAI_MODEL_OVERVIEW` | Model for overview narrative. | `gpt-5` |
| `REDIS_URL` | Optional Redis connection string. When empty, in-memory persistence is used. | — |
| `ALLOW_ORIGINS` | Comma-separated origins for downstream clients. | `http://localhost:3000` |

## Scripts

| Command | Description |
| --- | --- |
| `pnpm dev` | Run Next.js dev server with API + demo UI. |
| `pnpm build` | Production build (`next build`). |
| `pnpm start` | Start the compiled Next.js server. |
| `pnpm lint` | Run `next lint` with the project ESLint config. |
| `pnpm typecheck` | Verify TypeScript types (`tsc --noEmit`). |
| `pnpm test` | Run Vitest test suite (schemas, SSE contract, persistence parity). |
| `pnpm scan` | Run gitleaks secret scan (zero findings required in CI). |

## API Surface

All routes live under `/api/company-intel` (Node runtime).

| Method | Route | Notes |
| --- | --- | --- |
| `GET` | `/` | Returns `{ data: { profile, snapshots } }` with ISO timestamps. |
| `PATCH` | `/` | Applies sanitised updates (`companyName`, `tagline`, `overview`, `primaryIndustries`, `valueProps`, `keyOfferings`). |
| `POST` | `/preview` | Maps the domain and returns recommended selections before scraping. |
| `POST` | `/` | Triggers a run. JSON clients receive `{ data: result }`. If `Accept: text/event-stream`, the handler streams SSE frames (see below) and terminates with `[DONE]`. |
| `GET` | `/snapshots/:id/export` | Generates a PDF export (`Content-Disposition: attachment`). |

### SSE Contract

Each frame is emitted as `data: <json>\n\n` and the stream ends with `data: [DONE]\n\n`.

1. `snapshot-created` `{ status }`
2. `status` `{ stage, completed?, total? }`
3. `structured-delta` `{ delta, accumulated, summary? }`
4. `structured-reasoning-delta` `{ delta, headline? }`
5. `structured-complete` `{ payload }`
6. `overview-delta` `{ delta, displayText? }`
7. `overview-reasoning-delta` `{ delta, headline? }`
8. `overview-complete` `{ overview, headline? }`
9. `run-complete` `{ result }`
10. `run-error` `{ message }`
11. `[DONE]`

The UI hooks in `components/company-intel/hooks` assume this exact order and will fail fast if malformed frames are encountered.

## Architecture Snapshot

- **UI:** React + Tailwind (shadcn-inspired vendor shims) rendered by Next.js App Router (`app/page.tsx`).
- **API:** Route handlers under `app/api/**` adapt HTTP requests to server methods, perform Zod validation, and handle SSE framing.
- **Server:** `server` hosts orchestration (`createCompanyIntelServer`), Tavily + OpenAI clients, persistence, and PDF rendering.
- **Persistence:** In-memory by default (`createMemoryPersistence`) with optional Redis (`createRedisPersistence`). Both implement the same `CompanyIntelPersistence` interface.
- **Bootstrap:** `getCompanyIntelEnvironment()` wires dependencies once per process to avoid repeated client instantiation.
- **Docs:** Full system context lives in [`ARCHITECTURE.md`](./ARCHITECTURE.md) and the milestone tracker in [`docs/COMPANY_INTEL_EXECUTION_PLAN.md`](./docs/COMPANY_INTEL_EXECUTION_PLAN.md).

## Testing & CI

- **Unit:** Vitest covers serialisation, persistence parity (memory vs Redis mock), and SSE contract framing.
- **Lint/Typecheck:** `next lint` and `tsc --noEmit` guard type safety.
- **Security:** `pnpm scan` runs gitleaks; the GitHub Actions workflow enforces zero findings.
- **CI:** `.github/workflows/ci.yml` runs install → lint → typecheck → test → build → scan on pushes and pull requests.

## Limitations

- Automated tests mock OpenAI/Tavily – integration runs require valid keys.
- Redis support uses basic JSON serialization; for high-volume workloads you may want to add TTLs or secondary indices.
- PDF generation relies on `@react-pdf/renderer` and runs server-side; consider queuing for long-running exports in production.

For deeper details (streaming flow, data contracts, and bootstrap sequence) see [ARCHITECTURE.md](./ARCHITECTURE.md).
