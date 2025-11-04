// ------------------------------------------------------------------------------------------------
//                client.ts - Company overview agent orchestrator
// ------------------------------------------------------------------------------------------------

import { logger as defaultLogger } from '@agenai/logging';
import { zodTextFormat } from 'openai/helpers/zod';

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

  const requestPayload = {
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
      summary: 'auto',
    },
  } as const;

  const shouldStream = typeof responsesClient.stream === 'function' && typeof dependencies.onDelta === 'function';

  let streamingBuffer = '';

  const response = shouldStream
    ? await (async () => {
        const runner = responsesClient.stream!(requestPayload);

        runner.on?.('response.output_text.delta', (event: { delta?: unknown; snapshot?: unknown }) => {
          const delta = typeof event.delta === 'string' ? event.delta : undefined;
          if (!delta || delta.length === 0) {
            return;
          }
          const snapshotText = typeof event.snapshot === 'string' ? event.snapshot : undefined;
          streamingBuffer += delta;
          let parsed: CompanyOverviewStructuredOutput | null = null;

          const candidate = snapshotText ?? streamingBuffer;
          if (candidate) {
            try {
              const parsedJson = JSON.parse(candidate);
              const safeParsed = CompanyOverviewSchema.safeParse(parsedJson);
              if (safeParsed.success) {
                parsed = safeParsed.data;
              }
            } catch {
              // Wait for a complete JSON object before parsing.
            }
          }
          dependencies.onDelta?.({ delta, snapshot: snapshotText ?? null, parsed });
        });

        runner.on?.('response.reasoning_summary_text.delta', (event: { delta?: unknown; snapshot?: unknown }) => {
          const delta = typeof event.delta === 'string' ? event.delta : undefined;
          if (!delta || delta.length === 0) {
            return;
          }

          const snapshotText = typeof event.snapshot === 'string' ? event.snapshot : undefined;
          dependencies.onReasoningDelta?.({ delta, snapshot: snapshotText ?? null });
        });

        runner.on?.('response.error', (event: { error?: unknown }) => {
          log.error('company-intel:overview:stream-error', undefined, {
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
    log.error('company-intel:overview:parse-missing', undefined, {
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

  if (!shouldStream && rawText && rawText.length > 0) {
    dependencies.onDelta?.({ delta: rawText, snapshot: null, parsed: validated });
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
