"use client";

// ------------------------------------------------------------------------------------------------
//                streamReducer.ts - pure state machine for SSE run stream
// ------------------------------------------------------------------------------------------------

import type {
  CompanyIntelRunStage,
  CompanyIntelSnapshotStructuredProfileSummary,
  CompanyIntelStreamEvent,
} from '../../types';

export interface WorkflowStreamState {
  readonly isStreamActive: boolean;
  readonly streamStage: CompanyIntelRunStage | null;
  readonly streamProgress: { readonly completed: number; readonly total: number } | null;
  readonly streamSnapshotId: number | null;
  readonly overviewDraft: string | null;
  readonly structuredSummaryDraft: CompanyIntelSnapshotStructuredProfileSummary | null;
  readonly structuredReasoningHeadlinesDraft: readonly string[];
  readonly overviewReasoningHeadlinesDraft: readonly string[];
  readonly faviconDraft: string | null;
  readonly structuredTextBuffer: string | null;
}

export type WorkflowStreamAction =
  | { readonly type: 'reset-all' }
  | { readonly type: 'reset-drafts' }
  | { readonly type: 'start-request' }
  | {
      readonly type: 'hydrate-drafts';
      readonly payload: {
        readonly structuredProfile: CompanyIntelSnapshotStructuredProfileSummary | null;
        readonly overviewText: string | null;
        readonly structuredHeadlines: readonly string[];
        readonly overviewHeadlines: readonly string[];
        readonly faviconUrl: string | null;
      };
    }
  | { readonly type: 'event'; readonly event: CompanyIntelStreamEvent };

export const initialWorkflowStreamState: WorkflowStreamState = {
  isStreamActive: false,
  streamStage: null,
  streamProgress: null,
  streamSnapshotId: null,
  overviewDraft: null,
  structuredSummaryDraft: null,
  structuredReasoningHeadlinesDraft: [],
  overviewReasoningHeadlinesDraft: [],
  faviconDraft: null,
  structuredTextBuffer: null,
};

export function workflowStreamReducer(
  state: WorkflowStreamState,
  action: WorkflowStreamAction,
): WorkflowStreamState {
  switch (action.type) {
    case 'reset-all':
      return initialWorkflowStreamState;
    case 'reset-drafts':
      return {
        ...state,
        overviewDraft: null,
        structuredSummaryDraft: null,
        structuredReasoningHeadlinesDraft: [],
        overviewReasoningHeadlinesDraft: [],
        faviconDraft: null,
        structuredTextBuffer: null,
      };
    case 'hydrate-drafts':
      return {
        ...state,
        overviewDraft: action.payload.overviewText,
        structuredSummaryDraft: action.payload.structuredProfile,
        structuredReasoningHeadlinesDraft: action.payload.structuredHeadlines,
        overviewReasoningHeadlinesDraft: action.payload.overviewHeadlines,
        faviconDraft: action.payload.faviconUrl,
        structuredTextBuffer: null,
      };
    case 'start-request':
      return {
        ...initialWorkflowStreamState,
        isStreamActive: true,
      };
    case 'event':
      return applyStreamEvent(state, action.event);
    default:
      return state;
  }
}

function applyStreamEvent(state: WorkflowStreamState, event: CompanyIntelStreamEvent): WorkflowStreamState {
  switch (event.type) {
    case 'snapshot-created':
      return {
        ...state,
        isStreamActive: true,
        streamStage: 'mapping',
        streamProgress: null,
        streamSnapshotId: event.snapshotId,
        overviewDraft: null,
        structuredSummaryDraft: null,
        structuredReasoningHeadlinesDraft: [],
        overviewReasoningHeadlinesDraft: [],
        faviconDraft: null,
        structuredTextBuffer: null,
      };
    case 'status':
      return {
        ...state,
        isStreamActive: true,
        streamStage: event.stage,
        streamProgress:
          event.stage === 'scraping' && typeof event.completed === 'number' && typeof event.total === 'number'
            ? {
                completed: Math.min(event.completed, event.total),
                total: event.total,
              }
            : null,
      };
    case 'overview-delta': {
      const nextValue =
        event.displayText && event.displayText.trim().length > 0
          ? event.displayText.trim()
          : `${state.overviewDraft ?? ''}${event.delta}`;
      return {
        ...state,
        overviewDraft: nextValue,
      };
    }
    case 'overview-reasoning-delta':
      return {
        ...state,
        overviewReasoningHeadlinesDraft: event.headlines ?? [],
      };
    case 'overview-complete':
      return {
        ...state,
        overviewDraft: event.overview,
        overviewReasoningHeadlinesDraft: event.headlines ?? [],
      };
    case 'structured-delta': {
      const nextBuffer = `${state.structuredTextBuffer ?? ''}${event.delta}`;
      let structuredSummary = state.structuredSummaryDraft;
      if (event.summary) {
        structuredSummary = event.summary ?? state.structuredSummaryDraft;
      } else {
        try {
          const parsed = JSON.parse(nextBuffer) as CompanyIntelSnapshotStructuredProfileSummary;
          if (parsed && typeof parsed === 'object') {
            structuredSummary = parsed;
          }
        } catch {
          // Ignore JSON parse errors while the payload is still streaming.
        }
      }

      return {
        ...state,
        structuredTextBuffer: nextBuffer,
        structuredSummaryDraft: structuredSummary,
      };
    }
    case 'structured-reasoning-delta':
      return {
        ...state,
        structuredReasoningHeadlinesDraft: event.headlines ?? [],
      };
    case 'structured-complete':
      return {
        ...state,
        structuredSummaryDraft: event.payload.structuredProfile,
        structuredReasoningHeadlinesDraft:
          event.payload.metadata?.headlines ?? event.payload.reasoningHeadlines ?? [],
        faviconDraft: event.payload.faviconUrl ?? null,
        structuredTextBuffer: null,
      };
    case 'run-complete':
      return {
        ...state,
        isStreamActive: false,
        streamStage: null,
        streamProgress: null,
        streamSnapshotId: null,
        structuredTextBuffer: null,
      };
    case 'run-error':
    case 'run-cancelled':
      return {
        ...state,
        isStreamActive: false,
        streamStage: null,
        streamProgress: null,
        streamSnapshotId: null,
        overviewDraft: null,
        structuredSummaryDraft: null,
        structuredReasoningHeadlinesDraft: [],
        overviewReasoningHeadlinesDraft: [],
        faviconDraft: null,
        structuredTextBuffer: null,
      };
    case 'vector-store-status':
      return state;
    default:
      return state;
  }
}
