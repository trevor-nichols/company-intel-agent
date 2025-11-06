// ------------------------------------------------------------------------------------------------
//                bootstrap.ts - Factory helpers for constructing the Company Intel server runtime
// ------------------------------------------------------------------------------------------------

import { getEnvVar } from '@agenai/config';
import { logger as defaultLogger } from '@agenai/logging';

import { createCompanyIntelServer } from './server';
import type { CompanyIntelServer } from './bridge';
import type { CompanyIntelPersistence } from './services/persistence';
import { createOpenAIClient } from './integrations/openai/client';
import { createTavilyClient, type TavilyClient } from './integrations/tavily/client';
import type { OpenAIClientLike } from './agents/shared/openai';
import { createMemoryPersistence, createRedisPersistence } from './persistence';
import { CompanyIntelRunCoordinator } from './runtime/runCoordinator';

const DEFAULT_STRUCTURED_MODEL = 'gpt-5';
const DEFAULT_OVERVIEW_MODEL = 'gpt-5';

export interface CompanyIntelBootstrapOverrides {
  readonly persistence?: CompanyIntelPersistence;
  readonly redisUrl?: string | null;
  readonly openAIClient?: OpenAIClientLike;
  readonly tavilyClient?: TavilyClient;
  readonly logger?: typeof defaultLogger;
  readonly structuredOutputModel?: string;
  readonly overviewModel?: string;
}

export interface CompanyIntelEnvironment {
  readonly server: CompanyIntelServer;
  readonly persistence: CompanyIntelPersistence;
  readonly runtime: CompanyIntelRunCoordinator;
}

declare global {
  // eslint-disable-next-line no-var
  var __companyIntelEnvironment: CompanyIntelEnvironment | null | undefined;
}

const isProduction = process.env.NODE_ENV === 'production';

let cachedEnvironment: CompanyIntelEnvironment | null = globalThis.__companyIntelEnvironment ?? null;

async function disposeEnvironment(environment: CompanyIntelEnvironment | null): Promise<void> {
  if (!environment) {
    return;
  }

  const persistenceWithLifecycle = environment.persistence as {
    disconnect?: () => Promise<void> | void;
  };

  const disconnect = persistenceWithLifecycle.disconnect;
  if (typeof disconnect === 'function') {
    try {
      await disconnect.call(environment.persistence);
    } catch (error) {
      const err = error instanceof Error ? { name: error.name, message: error.message } : error ?? null;
      defaultLogger.warn('company-intel:bootstrap:persistence-disconnect-error', {
        error: err,
      });
    }
  }
}

function resolvePersistence(overrides: CompanyIntelBootstrapOverrides, log: typeof defaultLogger): CompanyIntelPersistence {
  if (overrides.persistence) {
    return overrides.persistence;
  }

  const redisUrl = overrides.redisUrl ?? getEnvVar('REDIS_URL');
  if (redisUrl) {
    return createRedisPersistence({ url: redisUrl, logger: log });
  }

  return createMemoryPersistence({ logger: log });
}

function resolveOpenAI(overrides: CompanyIntelBootstrapOverrides): OpenAIClientLike {
  if (overrides.openAIClient) {
    return overrides.openAIClient;
  }
  const { client } = createOpenAIClient();
  return client;
}

function resolveTavily(overrides: CompanyIntelBootstrapOverrides, log: typeof defaultLogger): TavilyClient {
  if (overrides.tavilyClient) {
    return overrides.tavilyClient;
  }
  return createTavilyClient({ logger: log });
}

function resolveStructuredModel(overrides: CompanyIntelBootstrapOverrides): string {
  return overrides.structuredOutputModel ?? getEnvVar('OPENAI_MODEL_STRUCTURED') ?? DEFAULT_STRUCTURED_MODEL;
}

function resolveOverviewModel(overrides: CompanyIntelBootstrapOverrides): string {
  return overrides.overviewModel ?? getEnvVar('OPENAI_MODEL_OVERVIEW') ?? DEFAULT_OVERVIEW_MODEL;
}

export function createCompanyIntelEnvironment(overrides: CompanyIntelBootstrapOverrides = {}): CompanyIntelEnvironment {
  const log = overrides.logger ?? defaultLogger;
  const persistence = resolvePersistence(overrides, log);
  const openAI = resolveOpenAI(overrides);
  const tavily = resolveTavily(overrides, log);
  const structuredOutputModel = resolveStructuredModel(overrides);
  const overviewModel = resolveOverviewModel(overrides);

  const server = createCompanyIntelServer({
    tavily,
    openAI,
    persistence,
    logger: log,
    structuredOutputModel,
    overviewModel,
  });

  const runtime = new CompanyIntelRunCoordinator({
    server,
    logger: log,
  });

  return { server, persistence, runtime } satisfies CompanyIntelEnvironment;
}

export function getCompanyIntelEnvironment(overrides: CompanyIntelBootstrapOverrides = {}): CompanyIntelEnvironment {
  const hasOverrides = Object.keys(overrides).length > 0;

  if (!cachedEnvironment && !hasOverrides) {
    cachedEnvironment = createCompanyIntelEnvironment();
    if (!isProduction) {
      globalThis.__companyIntelEnvironment = cachedEnvironment;
    }
  }

  if (cachedEnvironment && !hasOverrides) {
    return cachedEnvironment;
  }

  const environment = createCompanyIntelEnvironment(overrides);
  if (!hasOverrides && !isProduction) {
    globalThis.__companyIntelEnvironment = environment;
    cachedEnvironment = environment;
  }
  return environment;
}

export function resetCompanyIntelEnvironment(): void {
  const previous = cachedEnvironment;
  cachedEnvironment = null;
  if (!isProduction) {
    globalThis.__companyIntelEnvironment = null;
  }
  void disposeEnvironment(previous);
}
