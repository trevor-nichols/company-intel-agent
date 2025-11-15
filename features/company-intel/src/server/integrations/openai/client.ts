// ------------------------------------------------------------------------------------------------
//                client.ts - OpenAI client factory - Dependencies: @company-intel/config, @company-intel/logging, openai
// ------------------------------------------------------------------------------------------------

import { getEnvVar, requireEnvVar } from '@company-intel/config';
import { logger as defaultLogger } from '@company-intel/logging';
import OpenAI, { type ClientOptions, APIError } from 'openai';

import type { OpenAIClient, OpenAIClientConfig, ResolvedOpenAIClientConfig } from './types';

const DEFAULT_TIMEOUT_MS = 120_000;
const DEFAULT_MAX_RETRIES = 2;

function buildClientOptions(config: OpenAIClientConfig = {}): {
  readonly resolved: ResolvedOpenAIClientConfig;
  readonly options: ClientOptions;
} {
  const apiKey = config.apiKey ?? requireEnvVar('OPENAI_API_KEY');
  const baseUrl = config.baseUrl ?? getEnvVar('OPENAI_BASE_URL');
  const organization = config.organization ?? getEnvVar('OPENAI_ORGANIZATION');
  const project = config.project ?? getEnvVar('OPENAI_PROJECT');
  const timeout = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxRetries = config.maxRetries ?? DEFAULT_MAX_RETRIES;

  const resolved: ResolvedOpenAIClientConfig = {
    apiKey,
    baseUrl: baseUrl ?? null,
    organization: organization ?? null,
    project: project ?? null,
    timeoutMs: timeout,
    maxRetries,
  };

  const options: ClientOptions = {
    apiKey: resolved.apiKey,
    timeout: resolved.timeoutMs,
    maxRetries: resolved.maxRetries,
  };

  if (resolved.baseUrl) {
    options.baseURL = resolved.baseUrl;
  }

  if (resolved.organization) {
    options.organization = resolved.organization;
  }

  if (resolved.project) {
    options.project = resolved.project;
  }

  if (config.defaultHeaders) {
    options.defaultHeaders = { ...config.defaultHeaders };
  }

  return { resolved, options };
}

export function createOpenAIClient(config: OpenAIClientConfig = {}): OpenAIClient {
  const log = config.logger ?? defaultLogger;
  const { resolved, options } = buildClientOptions(config);

  log.debug?.('openai:client:init', {
    hasBaseUrl: Boolean(resolved.baseUrl),
    hasOrganization: Boolean(resolved.organization),
    hasProject: Boolean(resolved.project),
    timeoutMs: resolved.timeoutMs,
    maxRetries: resolved.maxRetries,
  });

  const client = new OpenAI(options);

  return {
    client,
    config: resolved,
  } satisfies OpenAIClient;
}

export function isOpenAIAPIError(error: unknown): error is APIError {
  return error instanceof OpenAI.APIError;
}
