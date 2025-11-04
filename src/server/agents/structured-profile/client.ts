// ------------------------------------------------------------------------------------------------
//                client.ts - Structured profile agent orchestrator
// ------------------------------------------------------------------------------------------------

import { logger as defaultLogger } from '@agenai/logging';
import { zodTextFormat } from 'openai/helpers/zod';

import { resolveOpenAIResponses, type OpenAIClientLike } from '../shared/openai';

import {
  CompanyIntelStructuredOutputSchema,
  type CompanyIntelStructuredOutput,
} from './schema';
import {
  DEFAULT_STRUCTURED_PROFILE_PROMPT,
  type CompanyIntelStructuredPromptConfig,
} from './prompts';
import { formatPagesAsXml, type CompanyIntelPageContent } from '../../transformers';
import { extractReasoningSummary, extractResponseText, extractUsageMetadata } from '../shared/response';

export interface GenerateStructuredProfileParams {
  readonly domain: string;
  readonly pages: readonly CompanyIntelPageContent[];
  readonly prompt?: CompanyIntelStructuredPromptConfig;
  readonly model?: string;
}

export interface GenerateStructuredProfileDependencies {
  readonly openAIClient: OpenAIClientLike;
  readonly logger?: typeof defaultLogger;
  readonly onDelta?: (payload: {
    readonly delta: string;
    readonly snapshot?: string | null;
    readonly parsed?: CompanyIntelStructuredOutput | null;
  }) => void;
  readonly onReasoningDelta?: (payload: { readonly delta: string; readonly snapshot?: string | null }) => void;
}

export interface StructuredProfileResult {
  readonly data: CompanyIntelStructuredOutput;
  readonly responseId: string;
  readonly model: string;
  readonly usage?: Record<string, unknown>;
  readonly rawText?: string | null;
  readonly reasoningSummary?: string | null;
}

export async function generateStructuredCompanyProfile(
  params: GenerateStructuredProfileParams,
  dependencies: GenerateStructuredProfileDependencies,
): Promise<StructuredProfileResult> {
  if (params.pages.length === 0) {
    throw new Error('generateStructuredCompanyProfile requires at least one page.');
  }

  const log = dependencies.logger ?? defaultLogger;
  const responsesClient = resolveOpenAIResponses(dependencies.openAIClient);
  const prompt = params.prompt ?? DEFAULT_STRUCTURED_PROFILE_PROMPT;

  const contentPayload = formatPagesAsXml(params.pages);
  const instructions = prompt.instructions?.trim() ??
    'Using the provided website pages, extract factual company profile details.';

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
      format: zodTextFormat(CompanyIntelStructuredOutputSchema, 'company_profile_structured_output'),
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

        runner.on?.('response.output_text.delta', (event: { readonly delta?: unknown; readonly snapshot?: unknown }) => {
          const delta = typeof event.delta === 'string' ? event.delta : undefined;
          if (!delta || delta.length === 0) {
            return;
          }

          const snapshotText = typeof event.snapshot === 'string' ? event.snapshot : undefined;
          streamingBuffer += delta;
          let parsed: CompanyIntelStructuredOutput | null = null;

          const candidate = snapshotText ?? streamingBuffer;
          if (candidate) {
            try {
              const parsedJson = JSON.parse(candidate);
              const safeParsed = CompanyIntelStructuredOutputSchema.safeParse(parsedJson);
              if (safeParsed.success) {
                parsed = safeParsed.data;
              }
            } catch {
              // Ignore partial payloads until JSON is complete.
            }
          }
          dependencies.onDelta?.({
            delta,
            snapshot: snapshotText ?? null,
            parsed,
          });
        });

        runner.on?.('response.reasoning_summary_text.delta', (event: { readonly delta?: unknown; readonly snapshot?: unknown }) => {
          const delta = typeof event.delta === 'string' ? event.delta : undefined;
          if (!delta || delta.length === 0) {
            return;
          }

          const snapshotText = typeof event.snapshot === 'string' ? event.snapshot : undefined;
          dependencies.onReasoningDelta?.({
            delta,
            snapshot: snapshotText ?? null,
          });
        });

        runner.on?.('response.error', (event: { readonly error?: unknown }) => {
          log.error('company-intel:structured:stream-error', undefined, {
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
    log.error('company-intel:structured-output:parse-missing', undefined, {
      domain: params.domain,
      model,
      responseId: response.id,
    });
    throw new Error('Structured output response did not include parsed content.');
  }

  const validated = CompanyIntelStructuredOutputSchema.parse(parsed);
  const usage = extractUsageMetadata(response);
  const rawText = extractResponseText(response);
  const reasoningSummary = extractReasoningSummary(response);

  return {
    data: validated,
    responseId: response.id,
    model,
    usage,
    rawText,
    reasoningSummary,
  } satisfies StructuredProfileResult;
}
