// ------------------------------------------------------------------------------------------------
//                client.ts - Company overview agent orchestrator
// ------------------------------------------------------------------------------------------------

import { logger as defaultLogger } from '@agenai/logging';
import { zodTextFormat } from 'openai/helpers/zod';
import type { ResponseCreateParams } from 'openai/resources/responses/responses';

import { resolveOpenAIResponses, type OpenAIClientLike } from '../shared/openai';

import { CompanyOverviewSchema, type CompanyOverviewStructuredOutput } from './schema';
import {
  DEFAULT_COMPANY_OVERVIEW_PROMPT,
  type CompanyOverviewPromptConfig,
} from './prompts';
import { formatPagesAsXml, type CompanyIntelPageContent } from '../../transformers';
import { extractReasoningSummary, extractResponseText, extractUsageMetadata } from '../shared/response';

export interface GenerateCompanyOverviewParams {
  readonly domain: string;
  readonly pages: readonly CompanyIntelPageContent[];
  readonly prompt?: CompanyOverviewPromptConfig;
  readonly model?: string;
}

export interface GenerateCompanyOverviewDependencies {
  readonly openAIClient: OpenAIClientLike;
  readonly logger?: typeof defaultLogger;
  readonly onDelta?: (payload: {
    readonly delta: string;
    readonly snapshot?: string | null;
    readonly parsed?: CompanyOverviewStructuredOutput | null;
    readonly displayText?: string | null;
  }) => void;
  readonly onReasoningDelta?: (payload: { readonly delta: string; readonly snapshot?: string | null }) => void;
}

export interface CompanyOverviewResult {
  readonly data: CompanyOverviewStructuredOutput;
  readonly responseId: string;
  readonly model: string;
  readonly usage?: Record<string, unknown>;
  readonly rawText?: string | null;
  readonly reasoningSummary?: string | null;
}

export async function generateCompanyOverview(
  params: GenerateCompanyOverviewParams,
  dependencies: GenerateCompanyOverviewDependencies,
): Promise<CompanyOverviewResult> {
  if (params.pages.length === 0) {
    throw new Error('generateCompanyOverview requires at least one page.');
  }

  const log = dependencies.logger ?? defaultLogger;
  const responsesClient = resolveOpenAIResponses(dependencies.openAIClient);
  const prompt = params.prompt ?? DEFAULT_COMPANY_OVERVIEW_PROMPT;

  const contentPayload = formatPagesAsXml(params.pages);
  const instructions = prompt.instructions?.trim() ??
    'Using the provided pages, write an executive-ready company overview.';

  const userMessage = `Domain: ${params.domain}\n\n${instructions}\n\n<pages>\n${contentPayload}\n</pages>`;

  const model = params.model ?? 'gpt-5';

  const requestPayload: ResponseCreateParams = {
    model,
    input: [
      {
        role: 'system',
        content: prompt.systemPrompt,
      },
      {
        role: 'user',
        content: userMessage,
      },
    ],
    text: {
      format: zodTextFormat(CompanyOverviewSchema, 'company_overview'),
    },
    reasoning: {
      effort: 'medium',
      summary: 'auto',
    },
  };

  const shouldStream = typeof responsesClient.stream === 'function' && typeof dependencies.onDelta === 'function';

  let streamingBuffer = '';
  let latestOverviewText = '';

  const response = shouldStream
    ? await (async () => {
        const streamPayload: ResponseCreateParams = {
          ...requestPayload,
          stream: true,
        };
        const runner = responsesClient.stream!(streamPayload);

        runner.on?.('response.output_text.delta', (rawEvent: unknown) => {
          const event = rawEvent as { delta?: unknown; snapshot?: unknown };
          const rawDelta = typeof event.delta === 'string' ? event.delta : undefined;
          if (!rawDelta || rawDelta.length === 0) {
            return;
          }

          const snapshotText = typeof event.snapshot === 'string' ? event.snapshot : undefined;
          streamingBuffer += rawDelta;

          const candidate = snapshotText ?? streamingBuffer;
          const overviewCandidate = candidate ? extractOverviewFromJson(candidate) : null;

          let parsed: CompanyOverviewStructuredOutput | null = null;
          let displayText: string | null = null;
          let textDelta = '';

          if (typeof overviewCandidate === 'string') {
            parsed = { overview: overviewCandidate } satisfies CompanyOverviewStructuredOutput;
            displayText = overviewCandidate;

            if (latestOverviewText && displayText.startsWith(latestOverviewText)) {
              textDelta = displayText.slice(latestOverviewText.length);
            } else {
              textDelta = displayText;
            }

            latestOverviewText = displayText;
          }

          const normalizedDelta = textDelta;
          if (!normalizedDelta && !displayText) {
            return;
          }

          dependencies.onDelta?.({
            delta: normalizedDelta,
            snapshot: snapshotText ?? null,
            parsed,
            displayText,
          });
        });

        runner.on?.('response.reasoning_summary_text.delta', (rawEvent: unknown) => {
          const event = rawEvent as { delta?: unknown; snapshot?: unknown };
          const delta = typeof event.delta === 'string' ? event.delta : undefined;
          if (!delta || delta.length === 0) {
            return;
          }

          const snapshotText = typeof event.snapshot === 'string' ? event.snapshot : undefined;
          dependencies.onReasoningDelta?.({ delta, snapshot: snapshotText ?? null });
        });

        type StreamOn = NonNullable<typeof runner.on>;
        const streamErrorEvent = 'response.error' as Parameters<StreamOn>[0];
        runner.on?.(streamErrorEvent, (rawEvent: unknown) => {
          const event = rawEvent as { error?: unknown };
          log.error('company-intel:overview:stream-error', {
            domain: params.domain,
            model,
            error: event?.error ?? null,
          });
        });

        return runner.finalResponse();
      })()
    : await responsesClient.parse(requestPayload);

  const parsed = response.output_parsed;
  if (!parsed) {
    log.error('company-intel:overview:parse-missing', {
      domain: params.domain,
      model,
      responseId: response.id,
    });
    throw new Error('Overview response did not include parsed content.');
  }

  const validated = CompanyOverviewSchema.parse(parsed);
  const usage = extractUsageMetadata(response);
  const rawText = extractResponseText(response);
  const reasoningSummary = extractReasoningSummary(response);

  if (!shouldStream && validated.overview.trim().length > 0) {
    const overviewText = validated.overview;
    dependencies.onDelta?.({
      delta: overviewText,
      snapshot: null,
      parsed: validated,
      displayText: overviewText,
    });
  }

  return {
    data: validated,
    responseId: response.id,
    model,
    usage,
    rawText,
    reasoningSummary,
  } satisfies CompanyOverviewResult;
}

function extractOverviewFromJson(candidate: string): string | null {
  if (!candidate) {
    return null;
  }

  try {
    const parsed = JSON.parse(candidate) as unknown;
    if (!parsed || typeof parsed !== 'object') {
      return null;
    }

    const overviewValue = (parsed as { overview?: unknown }).overview;
    return typeof overviewValue === 'string' ? overviewValue : null;
  } catch {
    // Ignore until valid JSON is available.
    return null;
  }
}
