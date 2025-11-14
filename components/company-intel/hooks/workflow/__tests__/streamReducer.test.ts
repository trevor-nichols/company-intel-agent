"use client";

import { describe, expect, it } from 'vitest';

import type { CompanyIntelSnapshotStructuredProfileSummary, CompanyIntelStreamEvent } from '../../../types';
import { initialWorkflowStreamState, workflowStreamReducer } from '../streamReducer';

const baseEvent = {
  domain: 'example.com',
  snapshotId: 42,
} as const;

describe('workflowStreamReducer', () => {
  it('handles snapshot creation and status updates', () => {
    const snapshotCreated: CompanyIntelStreamEvent = {
      ...baseEvent,
      type: 'snapshot-created',
      status: 'running',
    };
    const afterSnapshot = workflowStreamReducer(initialWorkflowStreamState, { type: 'event', event: snapshotCreated });
    expect(afterSnapshot.isStreamActive).toBe(true);
    expect(afterSnapshot.streamStage).toBe('mapping');
    expect(afterSnapshot.streamSnapshotId).toBe(42);

    const status: CompanyIntelStreamEvent = {
      ...baseEvent,
      type: 'status',
      stage: 'scraping',
      completed: 3,
      total: 10,
    };
    const afterStatus = workflowStreamReducer(afterSnapshot, { type: 'event', event: status });
    expect(afterStatus.streamStage).toBe('scraping');
    expect(afterStatus.streamProgress).toEqual({ completed: 3, total: 10 });
  });

  it('buffers overview deltas and display text', () => {
    const delta: CompanyIntelStreamEvent = {
      ...baseEvent,
      type: 'overview-delta',
      delta: 'Part ',
    };
    const withDelta = workflowStreamReducer(initialWorkflowStreamState, { type: 'event', event: delta });
    expect(withDelta.overviewDraft).toBe('Part ');

    const displayText: CompanyIntelStreamEvent = {
      ...baseEvent,
      type: 'overview-delta',
      delta: 'ignored',
      displayText: 'Final overview',
    };
    const withDisplay = workflowStreamReducer(withDelta, { type: 'event', event: displayText });
    expect(withDisplay.overviewDraft).toBe('Final overview');
  });

  it('parses structured deltas and completes payloads', () => {
    const structuredPayload: CompanyIntelSnapshotStructuredProfileSummary = {
      companyName: 'Acme',
      tagline: 'Tagline',
      valueProps: [],
      keyOfferings: [],
      primaryIndustries: [],
      sources: [],
    };

    const delta: CompanyIntelStreamEvent = {
      ...baseEvent,
      type: 'structured-delta',
      delta: JSON.stringify(structuredPayload),
      accumulated: JSON.stringify(structuredPayload),
    };

    const withDelta = workflowStreamReducer(initialWorkflowStreamState, { type: 'event', event: delta });
    expect(withDelta.structuredSummaryDraft).toEqual(structuredPayload);

    const complete: CompanyIntelStreamEvent = {
      ...baseEvent,
      type: 'structured-complete',
      payload: {
        structuredProfile: structuredPayload,
        faviconUrl: 'https://example.com/favicon.ico',
        reasoningHeadlines: ['done'],
      },
    };

    const completed = workflowStreamReducer(withDelta, { type: 'event', event: complete });
    expect(completed.structuredSummaryDraft).toEqual(structuredPayload);
    expect(completed.structuredReasoningHeadlinesDraft).toEqual(['done']);
    expect(completed.faviconDraft).toBe('https://example.com/favicon.ico');
  });

  it('clears state on run error', () => {
    const startRequest = workflowStreamReducer(initialWorkflowStreamState, { type: 'start-request' });
    const errorEvent: CompanyIntelStreamEvent = {
      ...baseEvent,
      type: 'run-error',
      message: 'boom',
    };
    const afterError = workflowStreamReducer(startRequest, { type: 'event', event: errorEvent });
    expect(afterError.isStreamActive).toBe(false);
    expect(afterError.streamStage).toBeNull();
    expect(afterError.overviewDraft).toBeNull();
    expect(afterError.structuredSummaryDraft).toBeNull();
  });
});
