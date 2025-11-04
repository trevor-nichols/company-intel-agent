# @agenai/feature-company-intel

> Modular company intel experience shared between onboarding flows and public demos. The package standardises orchestration, adapters, and UI primitives so any surface can run intel collections with consistent behaviour.

## Structure

```
src/
├── client/          # Hooks, adapters, and Johnny Ive UI slices for running intel sessions in the browser
├── server/          # Orchestration, adapters, and handler factories for API routes
├── shared/          # DTOs, mappers, and constants shared across environments
└── index.ts         # Barrel exports
```

## Commands

```bash
pnpm --filter @agenai/feature-company-intel build
pnpm --filter @agenai/feature-company-intel dev
pnpm --filter @agenai/feature-company-intel dev:types
pnpm --filter @agenai/feature-company-intel typecheck
pnpm --filter @agenai/feature-company-intel test
```

## Roadmap

1. Extract existing onboarding intel services into injected adapters.
2. Deliver an ephemeral demo adapter for public examples.
3. Publish shared UI primitives for dashboards and marketing surfaces.
4. Tighten rate limiting + observability contracts for production use.
