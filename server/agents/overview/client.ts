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
  const debugStream = process.env.COMPANY_INTEL_DEBUG_STREAM === 'true';
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
  const overviewStreamState: OverviewStreamParseState = {
    startIndex: null,
    cursor: 0,
    pendingEscape: false,
    unicodeBuffer: null,
    done: false,
    text: '',
  };

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

          if (debugStream) {
            const preview = rawDelta.length > 160 ? `${rawDelta.slice(0, 160)}…` : rawDelta;
            log.debug('company-intel:overview:stream-delta', {
              domain: params.domain,
              chunkLength: rawDelta.length,
              chunkPreview: preview,
              hasSnapshot: Boolean(snapshotText),
            });
          }

          streamingBuffer += rawDelta;

          const incrementalDelta = consumeOverviewStream(streamingBuffer, overviewStreamState);
          if (incrementalDelta && incrementalDelta.length > 0) {
            latestOverviewText = overviewStreamState.text;
            if (debugStream) {
              const preview = incrementalDelta.length > 160 ? `${incrementalDelta.slice(0, 160)}…` : incrementalDelta;
              log.debug('company-intel:overview:stream-text-delta', {
                domain: params.domain,
                chunkLength: incrementalDelta.length,
                chunkPreview: preview,
              });
            }
          }

          const candidate = snapshotText ?? streamingBuffer;
          const overviewCandidate = candidate ? extractOverviewFromJson(candidate) : null;

          let parsed: CompanyOverviewStructuredOutput | null = null;
          let displayText: string | null = null;
          let textDelta: string = incrementalDelta ?? '';

          if (typeof overviewCandidate === 'string') {
            parsed = { overview: overviewCandidate } satisfies CompanyOverviewStructuredOutput;
            displayText = overviewCandidate;

            const normalizedDisplay = displayText.trim();
            if (normalizedDisplay.length > 0) {
              if (latestOverviewText && normalizedDisplay.startsWith(latestOverviewText)) {
                if (normalizedDisplay.length > latestOverviewText.length) {
                  textDelta = normalizedDisplay.slice(latestOverviewText.length);
                } else if (!textDelta) {
                  textDelta = normalizedDisplay;
                }
              } else {
                textDelta = normalizedDisplay;
              }

              latestOverviewText = normalizedDisplay;
              displayText = normalizedDisplay;
              overviewStreamState.text = normalizedDisplay;
            } else {
              textDelta = '';
            }
          }

          const normalizedDelta = textDelta;
          const hasPayload = Boolean((normalizedDelta && normalizedDelta.length > 0) || displayText);
          if (!hasPayload) {
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

interface OverviewStreamParseState {
  startIndex: number | null;
  cursor: number;
  pendingEscape: boolean;
  unicodeBuffer: string | null;
  done: boolean;
  text: string;
}

function consumeOverviewStream(buffer: string, state: OverviewStreamParseState): string | null {
  if (!buffer || state.done) {
    return null;
  }

  if (state.startIndex === null) {
    const startIndex = locateOverviewStringStart(buffer);
    if (startIndex === null) {
      return null;
    }

    state.startIndex = startIndex;
    state.cursor = startIndex;
  }

  let appended = '';
  let index = state.cursor;

  while (index < buffer.length) {
    const char = buffer[index];

    if (state.unicodeBuffer !== null) {
      if (/^[0-9a-fA-F]$/.test(char)) {
        state.unicodeBuffer += char;
        index += 1;

        if (state.unicodeBuffer.length === 4) {
          const codePoint = Number.parseInt(state.unicodeBuffer, 16);
          appended += String.fromCharCode(codePoint);
          state.unicodeBuffer = null;
        }
      } else {
        // Invalid sequence; abandon unicode escape and include raw character.
        state.unicodeBuffer = null;
        appended += char;
        index += 1;
      }

      continue;
    }

    if (state.pendingEscape) {
      state.pendingEscape = false;
      switch (char) {
        case '"':
          appended += '"';
          break;
        case '\\':
          appended += '\\';
          break;
        case '/':
          appended += '/';
          break;
        case 'b':
          appended += '\b';
          break;
        case 'f':
          appended += '\f';
          break;
        case 'n':
          appended += '\n';
          break;
        case 'r':
          appended += '\r';
          break;
        case 't':
          appended += '\t';
          break;
        case 'u':
          state.unicodeBuffer = '';
          break;
        default:
          appended += char;
          break;
      }

      index += 1;
      continue;
    }

    if (char === '\\') {
      state.pendingEscape = true;
      index += 1;
      continue;
    }

    if (char === '"') {
      state.done = true;
      index += 1;
      break;
    }

    appended += char;
    index += 1;
  }

  if (index === state.cursor) {
    return null;
  }

  state.cursor = index;

  if (appended.length > 0) {
    state.text += appended;
    return appended;
  }

  return null;
}

function locateOverviewStringStart(buffer: string): number | null {
  const keyIndex = buffer.indexOf('"overview"');
  if (keyIndex === -1) {
    return null;
  }

  let index = buffer.indexOf(':', keyIndex + '"overview"'.length);
  if (index === -1) {
    return null;
  }

  index += 1;
  while (index < buffer.length && /\s/.test(buffer[index])) {
    index += 1;
  }

  if (index >= buffer.length || buffer[index] !== '"') {
    return null;
  }

  return index + 1;
}
