// ------------------------------------------------------------------------------------------------
//                bootstrap.ts - Factory helpers for constructing the Company Intel server runtime
// ------------------------------------------------------------------------------------------------

import { getEnvVar } from '../config/env';
import { logger as defaultLogger } from '../config/logging';

import { createCompanyIntelServer } from './server';
import type { CompanyIntelServer } from './bridge';
import type { CompanyIntelPersistence } from './services/persistence';
import { createOpenAIClient } from './integrations/openai/client';
import { createTavilyClient, type TavilyClient } from './integrations/tavily/client';
import type { TavilyExtractDepth } from './integrations/tavily/types';
import type { OpenAIClientLike } from './agents/shared/openai';
import { createMemoryPersistence, createRedisPersistence } from './persistence';
import { CompanyIntelRunCoordinator } from './runtime/runCoordinator';
import { isReasoningEffortLevel, type ReasoningEffortLevel } from './agents/shared/reasoning';

const DEFAULT_STRUCTURED_MODEL = 'gpt-5.1';
const DEFAULT_OVERVIEW_MODEL = 'gpt-5.1';
const DEFAULT_TAVILY_EXTRACT_DEPTH: TavilyExtractDepth = 'basic';
const DEFAULT_CHAT_MODEL = 'gpt-5.1';
const DEFAULT_STRUCTURED_REASONING_EFFORT: ReasoningEffortLevel = 'medium';
const DEFAULT_OVERVIEW_REASONING_EFFORT: ReasoningEffortLevel = 'medium';
const DEFAULT_CHAT_REASONING_EFFORT: ReasoningEffortLevel = 'low';

export interface CompanyIntelBootstrapOverrides {
  readonly persistence?: CompanyIntelPersistence;
  readonly redisUrl?: string | null;
  readonly openAIClient?: OpenAIClientLike;
  readonly tavilyClient?: TavilyClient;
  readonly tavilyExtractDepth?: TavilyExtractDepth;
  readonly logger?: typeof defaultLogger;
  readonly structuredOutputModel?: string;
  readonly overviewModel?: string;
  readonly chatModel?: string;
  readonly structuredReasoningEffort?: ReasoningEffortLevel;
  readonly overviewReasoningEffort?: ReasoningEffortLevel;
  readonly chatReasoningEffort?: ReasoningEffortLevel;
}

export interface CompanyIntelEnvironment {
  readonly server: CompanyIntelServer;
  readonly persistence: CompanyIntelPersistence;
  readonly runtime: CompanyIntelRunCoordinator;
  readonly openAI: OpenAIClientLike;
  readonly chatModel: string;
  readonly chatReasoningEffort: ReasoningEffortLevel;
}

declare global {
  // eslint-disable-next-line no-var
  var __companyIntelEnvironment: CompanyIntelEnvironment | null | undefined;
}

const isProduction = process.env.NODE_ENV === 'production';

let cachedEnvironment: CompanyIntelEnvironment | null = globalThis.__companyIntelEnvironment ?? null;

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

function resolveTavilyExtractDepth(overrides: CompanyIntelBootstrapOverrides): TavilyExtractDepth {
  if (overrides.tavilyExtractDepth) {
    return overrides.tavilyExtractDepth;
  }

  const candidate = getEnvVar('TAVILY_EXTRACT_DEPTH');
  if (!candidate) {
    return DEFAULT_TAVILY_EXTRACT_DEPTH;
  }

  const normalized = candidate.trim().toLowerCase();
  if (normalized === 'basic' || normalized === 'advanced') {
    return normalized as TavilyExtractDepth;
  }

  throw new Error(
    `Invalid TAVILY_EXTRACT_DEPTH value "${candidate}". Expected "basic" or "advanced".`,
  );
}

function resolveStructuredModel(overrides: CompanyIntelBootstrapOverrides): string {
  return overrides.structuredOutputModel ?? getEnvVar('OPENAI_MODEL_STRUCTURED') ?? DEFAULT_STRUCTURED_MODEL;
}

function resolveOverviewModel(overrides: CompanyIntelBootstrapOverrides): string {
  return overrides.overviewModel ?? getEnvVar('OPENAI_MODEL_OVERVIEW') ?? DEFAULT_OVERVIEW_MODEL;
}

function resolveChatModel(overrides: CompanyIntelBootstrapOverrides): string {
  return overrides.chatModel ?? getEnvVar('OPENAI_MODEL_CHAT') ?? DEFAULT_CHAT_MODEL;
}

function resolveReasoningEffort(
  override: ReasoningEffortLevel | undefined,
  envKey: string,
  defaultValue: ReasoningEffortLevel,
): ReasoningEffortLevel {
  if (override) {
    return override;
  }

  const candidate = getEnvVar(envKey);
  if (!candidate) {
    return defaultValue;
  }

  const normalized = candidate.trim().toLowerCase();
  if (isReasoningEffortLevel(normalized)) {
    return normalized;
  }

  throw new Error(
    `Invalid ${envKey} value "${candidate}". Expected "low", "medium", or "high".`,
  );
}

function resolveStructuredReasoningEffort(overrides: CompanyIntelBootstrapOverrides): ReasoningEffortLevel {
  return resolveReasoningEffort(
    overrides.structuredReasoningEffort,
    'STRUCTURED_REASONING_EFFORT',
    DEFAULT_STRUCTURED_REASONING_EFFORT,
  );
}

function resolveOverviewReasoningEffort(overrides: CompanyIntelBootstrapOverrides): ReasoningEffortLevel {
  return resolveReasoningEffort(
    overrides.overviewReasoningEffort,
    'OVERVIEW_REASONING_EFFORT',
    DEFAULT_OVERVIEW_REASONING_EFFORT,
  );
}

function resolveChatReasoningEffort(overrides: CompanyIntelBootstrapOverrides): ReasoningEffortLevel {
  return resolveReasoningEffort(
    overrides.chatReasoningEffort,
    'CHAT_REASONING_EFFORT',
    DEFAULT_CHAT_REASONING_EFFORT,
  );
}

export function createCompanyIntelEnvironment(overrides: CompanyIntelBootstrapOverrides = {}): CompanyIntelEnvironment {
  const log = overrides.logger ?? defaultLogger;
  const persistence = resolvePersistence(overrides, log);
  const openAI = resolveOpenAI(overrides);
  const tavily = resolveTavily(overrides, log);
  const tavilyExtractDepth = resolveTavilyExtractDepth(overrides);
  const structuredOutputModel = resolveStructuredModel(overrides);
  const overviewModel = resolveOverviewModel(overrides);
  const chatModel = resolveChatModel(overrides);
  const structuredReasoningEffort = resolveStructuredReasoningEffort(overrides);
  const overviewReasoningEffort = resolveOverviewReasoningEffort(overrides);
  const chatReasoningEffort = resolveChatReasoningEffort(overrides);

  const server = createCompanyIntelServer({
    tavily,
    openAI,
    persistence,
    logger: log,
    structuredOutputModel,
    structuredReasoningEffort,
    overviewModel,
    overviewReasoningEffort,
    tavilyExtractDepth,
    chatModel,
  });

  const runtime = new CompanyIntelRunCoordinator({
    server,
    logger: log,
  });

  return { server, persistence, runtime, openAI, chatModel, chatReasoningEffort } satisfies CompanyIntelEnvironment;
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
