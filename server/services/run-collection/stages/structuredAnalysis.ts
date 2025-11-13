// ------------------------------------------------------------------------------------------------
//                structuredAnalysis.ts - Structured profile generation stage
// ------------------------------------------------------------------------------------------------

import type { Logger } from '@agenai/logging';

import {
  generateStructuredCompanyProfile,
  DEFAULT_STRUCTURED_PROFILE_PROMPT,
} from '../../../agents/structured-profile';
import type { CompanyIntelStructuredOutput } from '../../../agents/structured-profile';
import type { RunContext } from '../context';
import type {
  CompanyIntelSnapshotStructuredProfileSummary,
  CompanyProfileKeyOffering,
  StructuredAnalysisResult,
  RunCompanyIntelCollectionDependencies,
  CompanyIntelPageContent,
} from '../types';
import { extractReasoningHeadlines, normalizeReasoningSummary } from '../helpers/reasoning';

interface StructuredAnalysisInputs {
  readonly domain: string;
  readonly pages: readonly CompanyIntelPageContent[];
  readonly faviconUrl: string | null;
}

export async function runStructuredAnalysis(
  context: RunContext,
  inputs: StructuredAnalysisInputs,
  dependencies: Pick<RunCompanyIntelCollectionDependencies, 'openAIClient' | 'logger' | 'structuredOutputPrompt' | 'structuredOutputModel' | 'structuredReasoningEffort'>,
): Promise<StructuredAnalysisResult> {
  const log: Logger = dependencies.logger ?? context.logger;

  context.emitStage('analysis_structured');
  context.throwIfCancelled('analysis_structured');

  let structuredDeltaBuffer = '';
  let structuredReasoningSummaryBuffer = '';
  let structuredReasoningHeadlines: readonly string[] = [];
  let structuredSummaryDraft: CompanyIntelSnapshotStructuredProfileSummary | null = null;
  let emittedStructuredReasoningDelta = false;

  const handleStructuredDelta = ({
    delta,
    snapshot,
    parsed,
  }: {
    readonly delta: string;
    readonly snapshot?: string | null;
    readonly parsed?: CompanyIntelStructuredOutput | null;
  }): void => {
    if (!delta || context.isRunTerminated()) {
      return;
    }

    structuredDeltaBuffer += delta;
    if (parsed) {
      structuredSummaryDraft = buildStructuredProfileSummary(parsed).summary;
    }

    context.emitEvent({
      type: 'structured-delta',
      delta,
      accumulated: structuredDeltaBuffer,
      snapshot: snapshot ?? null,
      summary: structuredSummaryDraft,
    });
  };

  const handleStructuredReasoningDelta = ({
    delta,
    snapshot,
  }: {
    readonly delta: string;
    readonly snapshot?: string | null;
  }): void => {
    if (!delta || delta.length === 0 || context.isRunTerminated()) {
      return;
    }

    structuredReasoningSummaryBuffer += delta;
    structuredReasoningHeadlines = extractReasoningHeadlines(structuredReasoningSummaryBuffer);
    emittedStructuredReasoningDelta = true;

    context.emitEvent({
      type: 'structured-reasoning-delta',
      delta,
      headlines: structuredReasoningHeadlines,
      snapshot: snapshot ?? null,
    });
  };

  const result = await generateStructuredCompanyProfile(
    {
      domain: inputs.domain,
      pages: inputs.pages,
      prompt: dependencies.structuredOutputPrompt ?? DEFAULT_STRUCTURED_PROFILE_PROMPT,
      model: dependencies.structuredOutputModel,
      reasoningEffort: dependencies.structuredReasoningEffort,
    },
    {
      openAIClient: dependencies.openAIClient,
      logger: log,
      onDelta: context.isRunTerminated() ? undefined : handleStructuredDelta,
      onReasoningDelta: context.isRunTerminated() ? undefined : handleStructuredReasoningDelta,
    },
  );

  context.throwIfCancelled('analysis_structured_complete');

  if (!emittedStructuredReasoningDelta && result.reasoningSummary) {
    structuredReasoningSummaryBuffer = result.reasoningSummary;
    structuredReasoningHeadlines = extractReasoningHeadlines(structuredReasoningSummaryBuffer);
    if (!context.isRunTerminated() && structuredReasoningSummaryBuffer.length > 0) {
      context.emitEvent({
        type: 'structured-reasoning-delta',
        delta: structuredReasoningSummaryBuffer,
        headlines: structuredReasoningHeadlines,
        snapshot: null,
      });
    }
  }

  const { summary, normalizedTagline } = buildStructuredProfileSummary(result.data);

  const structuredReasoningSummaryRaw = structuredReasoningSummaryBuffer || result.reasoningSummary || null;
  if (structuredReasoningHeadlines.length === 0 && structuredReasoningSummaryRaw) {
    structuredReasoningHeadlines = extractReasoningHeadlines(structuredReasoningSummaryRaw);
  }
  const structuredReasoningSummary = normalizeReasoningSummary(
    structuredReasoningSummaryRaw,
    structuredReasoningHeadlines,
  );

  const metadata = {
    responseId: result.responseId ?? null,
    model: result.model ?? null,
    usage: result.usage ?? null,
    rawText: result.rawText ?? null,
  } as const;

  context.emitEvent({
    type: 'structured-complete',
    payload: {
      structuredProfile: summary,
      metadata: {
        responseId: metadata.responseId,
        model: metadata.model,
        usage: metadata.usage,
        rawText: metadata.rawText,
        headlines: structuredReasoningHeadlines,
        summary: structuredReasoningSummary,
      },
      faviconUrl: inputs.faviconUrl,
      reasoningHeadlines: structuredReasoningHeadlines,
    },
  });

  return {
    summary,
    normalizedTagline,
    reasoningHeadlines: structuredReasoningHeadlines,
    reasoningSummary: structuredReasoningSummary,
    metadata,
    faviconUrl: inputs.faviconUrl,
    rawText: result.rawText ?? null,
  } satisfies StructuredAnalysisResult;
}

function buildStructuredProfileSummary(data: CompanyIntelStructuredOutput): {
  readonly summary: CompanyIntelSnapshotStructuredProfileSummary;
  readonly normalizedTagline: string | null;
} {
  const normalizedTagline = normalizeOptionalString(data.tagline);
  const summary: CompanyIntelSnapshotStructuredProfileSummary = {
    companyName: data.companyName,
    tagline: normalizedTagline,
    valueProps: data.valueProps
      .map((value: string) => value.trim())
      .filter(value => value.length > 0),
    keyOfferings: data.keyOfferings.map((offering: CompanyIntelStructuredOutput['keyOfferings'][number]) => {
      const description = normalizeOptionalString(offering.description);
      return {
        title: offering.title.trim(),
        ...(description ? { description } : {}),
      } satisfies CompanyProfileKeyOffering;
    }),
    primaryIndustries: data.primaryIndustries
      .map((industry: string) => industry.trim())
      .filter(industry => industry.length > 0),
    sources: data.sources.map((source: CompanyIntelStructuredOutput['sources'][number]) => {
      const rationale = normalizeOptionalString(source.rationale);
      return {
        page: source.page.trim(),
        url: source.url,
        ...(rationale ? { rationale } : {}),
      };
    }),
  };

  return { summary, normalizedTagline };
}

function normalizeOptionalString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}
