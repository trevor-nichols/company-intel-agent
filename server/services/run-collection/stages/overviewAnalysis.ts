// ------------------------------------------------------------------------------------------------
//                overviewAnalysis.ts - Company overview generation stage
// ------------------------------------------------------------------------------------------------

import type { Logger } from '@agenai/logging';

import {
  generateCompanyOverview,
  DEFAULT_COMPANY_OVERVIEW_PROMPT,
} from '../../../agents/overview';
import type { CompanyOverviewStructuredOutput } from '../../../agents/overview';
import type { RunContext } from '../context';
import type {
  OverviewAnalysisResult,
  RunCompanyIntelCollectionDependencies,
  CompanyIntelPageContent,
} from '../types';
import { extractReasoningHeadlines, normalizeReasoningSummary } from '../helpers/reasoning';

interface OverviewAnalysisInputs {
  readonly domain: string;
  readonly pages: readonly CompanyIntelPageContent[];
}

export async function runOverviewAnalysis(
  context: RunContext,
  inputs: OverviewAnalysisInputs,
  dependencies: Pick<RunCompanyIntelCollectionDependencies, 'openAIClient' | 'logger' | 'overviewPrompt' | 'overviewModel'>,
): Promise<OverviewAnalysisResult> {
  const log: Logger = dependencies.logger ?? context.logger;

  context.emitStage('analysis_overview');
  context.throwIfCancelled('analysis_overview');

  let overviewReasoningSummaryBuffer = '';
  let overviewReasoningHeadlines: readonly string[] = [];
  let emittedOverviewReasoningDelta = false;
  let overviewDraft: string | null = null;

  const handleOverviewDelta = ({
    delta,
    snapshot,
    parsed,
    displayText,
  }: {
    readonly delta: string;
    readonly snapshot?: string | null;
    readonly parsed?: CompanyOverviewStructuredOutput | null;
    readonly displayText?: string | null;
  }): void => {
    if (context.isRunTerminated()) {
      return;
    }

    const normalizedDisplayText = (() => {
      if (typeof displayText === 'string' && displayText.trim().length > 0) {
        return displayText.trim();
      }
      if (parsed?.overview) {
        return parsed.overview.trim();
      }
      return null;
    })();

    if (normalizedDisplayText) {
      overviewDraft = normalizedDisplayText;
    }

    const cleanDelta = typeof delta === 'string' ? delta : '';
    const hasContent = Boolean((cleanDelta && cleanDelta.length > 0) || normalizedDisplayText);
    if (!hasContent) {
      return;
    }

    context.emitEvent({
      type: 'overview-delta',
      delta: cleanDelta,
      snapshot: snapshot ?? null,
      displayText: overviewDraft,
    });
  };

  const handleOverviewReasoningDelta = ({
    delta,
    snapshot,
  }: {
    readonly delta: string;
    readonly snapshot?: string | null;
  }): void => {
    if (!delta || delta.length === 0 || context.isRunTerminated()) {
      return;
    }

    overviewReasoningSummaryBuffer += delta;
    overviewReasoningHeadlines = extractReasoningHeadlines(overviewReasoningSummaryBuffer);
    emittedOverviewReasoningDelta = true;

    context.emitEvent({
      type: 'overview-reasoning-delta',
      delta,
      headlines: overviewReasoningHeadlines,
      snapshot: snapshot ?? null,
    });
  };

  const result = await generateCompanyOverview(
    {
      domain: inputs.domain,
      pages: inputs.pages,
      prompt: dependencies.overviewPrompt ?? DEFAULT_COMPANY_OVERVIEW_PROMPT,
      model: dependencies.overviewModel,
    },
    {
      openAIClient: dependencies.openAIClient,
      logger: log,
      onDelta: context.isRunTerminated() ? undefined : handleOverviewDelta,
      onReasoningDelta: context.isRunTerminated() ? undefined : handleOverviewReasoningDelta,
    },
  );

  context.throwIfCancelled('analysis_overview_complete');

  if (!emittedOverviewReasoningDelta && result.reasoningSummary) {
    overviewReasoningSummaryBuffer = result.reasoningSummary;
    overviewReasoningHeadlines = extractReasoningHeadlines(overviewReasoningSummaryBuffer);
    if (!context.isRunTerminated() && overviewReasoningSummaryBuffer.length > 0) {
      context.emitEvent({
        type: 'overview-reasoning-delta',
        delta: overviewReasoningSummaryBuffer,
        headlines: overviewReasoningHeadlines,
        snapshot: null,
      });
    }
  }

  const overviewReasoningSummaryRaw = overviewReasoningSummaryBuffer || result.reasoningSummary || null;
  if (overviewReasoningHeadlines.length === 0 && overviewReasoningSummaryRaw) {
    overviewReasoningHeadlines = extractReasoningHeadlines(overviewReasoningSummaryRaw);
  }
  const overviewReasoningSummary = normalizeReasoningSummary(
    overviewReasoningSummaryRaw,
    overviewReasoningHeadlines,
  );

  const overviewContent = result.data.overview.trim();

  context.emitEvent({
    type: 'overview-complete',
    overview: overviewContent,
    headlines: overviewReasoningHeadlines,
  });

  const metadata = {
    responseId: result.responseId ?? null,
    model: result.model ?? null,
    usage: result.usage ?? null,
    rawText: result.rawText ?? null,
  } as const;

  return {
    overview: overviewContent,
    reasoningHeadlines: overviewReasoningHeadlines,
    reasoningSummary: overviewReasoningSummary,
    metadata,
  } satisfies OverviewAnalysisResult;
}
