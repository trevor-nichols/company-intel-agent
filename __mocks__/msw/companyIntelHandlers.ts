// ------------------------------------------------------------------------------------------------
//                storybook/msw/companyIntelHandlers.ts - MSW handlers for Company Intel flows
// ------------------------------------------------------------------------------------------------

// ------------------------------------------------------------------------------------------------
//                REST Handlers
// ------------------------------------------------------------------------------------------------

import { HttpResponse, delay, http } from 'msw';

import type { TriggerCompanyIntelResult } from '../../components/company-intel/types';

import {
  companyIntelApiPayload,
  companyIntelPreviewFixture,
  triggerCompanyIntelResultFixture,
  emptyCompanyIntelApiPayload,
  emptyCompanyIntelPreviewFixture,
  triggerCompanyIntelEmptyResultFixture,
} from '../fixtures/companyIntel';

const API_BASE = '/api/company-intel';

type CompanyIntelPayload =
  | typeof companyIntelApiPayload
  | typeof emptyCompanyIntelApiPayload
  | Record<string, unknown>;

interface CompanyIntelHandlerOptions {
  readonly payload?: CompanyIntelPayload;
  readonly preview?: unknown;
  readonly triggerResult?: TriggerCompanyIntelResult;
  readonly streamEvents?: ReadonlyArray<Record<string, unknown>> | null;
}

function createEventStream(events: ReadonlyArray<Record<string, unknown>>) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const push = async (event: Record<string, unknown>, waitMs = 120) => {
        if (waitMs > 0) {
          await delay(waitMs);
        }
        const payload = `data: ${JSON.stringify(event)}\n\n`;
        controller.enqueue(encoder.encode(payload));
      };

      for (const event of events) {
        await push(event);
      }

      controller.enqueue(encoder.encode('data: [DONE]\n\n'));
      controller.close();
    },
  });

  return stream;
}

function createDefaultStreamEvents(triggerResult: TriggerCompanyIntelResult, payload: CompanyIntelPayload) {
  const payloadRecord = payload as Record<string, unknown>;
  const profile = (payloadRecord.profile ?? null) as Record<string, unknown> | null;
  const snapshots = (payloadRecord.snapshots ?? []) as Array<Record<string, unknown>>;

  const domain =
    typeof profile?.domain === 'string' && profile.domain.length > 0
      ? profile.domain
      : 'acmeintel.ai';

  const firstSnapshot = (snapshots[0] ?? null) as Record<string, unknown> | null;
  const summaries = (firstSnapshot?.summaries ?? null) as Record<string, unknown> | null;

  const structuredProfile =
    (summaries?.structuredProfile as Record<string, unknown> | undefined) ??
    (profile?.structuredProfile as Record<string, unknown> | undefined) ??
    null;
  const structuredHeadline =
    (summaries?.metadata as { structuredProfile?: { headline?: string } })?.structuredProfile?.headline ??
    'Framing differentiators for revenue intelligence';
  const overviewText = (summaries?.overview as string | undefined) ??
    'Acme Intel Systems helps revenue leaders act on competitive shifts faster than the market moves.';
  const overviewHeadline =
    (summaries?.metadata as { overview?: { headline?: string } })?.overview?.headline ??
    'Summarising why Acme accelerates GTM teams';
  const baseEvent = {
    snapshotId: triggerResult.snapshotId,
    teamId: triggerResult.teamId,
    domain,
  };

  const structuredDeltaSeed = structuredProfile ? JSON.stringify(structuredProfile) : '{}';

  return [
    {
      ...baseEvent,
      type: 'snapshot-created',
      status: 'pending',
    },
    {
      ...baseEvent,
      type: 'status',
      stage: 'mapping',
    },
    {
      ...baseEvent,
      type: 'status',
      stage: 'scraping',
      completed: 1,
      total: 4,
    },
    {
      ...baseEvent,
      type: 'overview-delta',
      delta: 'Acme Intel Systems kickstarts intelligence orchestration… ',
    },
    {
      ...baseEvent,
      type: 'overview-reasoning-delta',
      delta: `**${overviewHeadline}**`,
      headline: overviewHeadline,
      snapshot: null,
    },
    {
      ...baseEvent,
      type: 'structured-delta',
      delta: structuredDeltaSeed.slice(0, 120),
      accumulated: structuredDeltaSeed.slice(0, 120),
      snapshot: null,
    },
    {
      ...baseEvent,
      type: 'structured-reasoning-delta',
      delta: `**${structuredHeadline}**`,
      headline: structuredHeadline,
      snapshot: null,
    },
    {
      ...baseEvent,
      type: 'structured-complete',
      payload: {
        structuredProfile,
        faviconUrl: 'https://assets.agen-ai.com/storybook/acmeintel/favicon.png',
        metadata: {
          model: 'gpt-5-story',
          responseId: 'resp_story_structured',
          headline: structuredHeadline,
          summary: 'Focus on key differentiators and explain how briefs reduce cycle time for exec decisions.',
        },
        reasoningHeadline: structuredHeadline,
      },
    },
    {
      ...baseEvent,
      type: 'overview-complete',
      overview: overviewText,
      headline: overviewHeadline,
    },
    {
      ...baseEvent,
      type: 'run-complete',
      result: triggerResult,
    },
  ];
}

export const createCompanyIntelHandlers = ({
  payload = companyIntelApiPayload,
  preview = companyIntelPreviewFixture,
  triggerResult = triggerCompanyIntelResultFixture,
  streamEvents,
}: CompanyIntelHandlerOptions = {}) => {
  const resolvedPayload = payload ?? companyIntelApiPayload;
  const resolvedTrigger = triggerResult ?? triggerCompanyIntelResultFixture;
  const resolvedStreamEvents =
    streamEvents === undefined
      ? createDefaultStreamEvents(resolvedTrigger, resolvedPayload)
      : streamEvents;

  return [
    http.get(API_BASE, async () => {
      await delay(200);
      return HttpResponse.json({ data: resolvedPayload });
    }),
    http.post(`${API_BASE}/preview`, async () => {
      await delay(180);
      return HttpResponse.json({ data: preview });
    }),
    http.post(API_BASE, async ({ request }) => {
      const accept = request.headers.get('accept') ?? '';

      if (resolvedStreamEvents && accept.includes('text/event-stream')) {
        return new HttpResponse(createEventStream(resolvedStreamEvents), {
          headers: {
            'Content-Type': 'text/event-stream',
            Connection: 'keep-alive',
            'Cache-Control': 'no-cache',
          },
        });
      }

      await delay(220);
      return HttpResponse.json({ data: resolvedTrigger });
    }),
  ] as const;
};

export const companyIntelHandlers = createCompanyIntelHandlers();

export const companyIntelEmptyHandlers = createCompanyIntelHandlers({
  payload: emptyCompanyIntelApiPayload,
  preview: emptyCompanyIntelPreviewFixture,
  triggerResult: triggerCompanyIntelEmptyResultFixture,
  streamEvents: null,
});

export const companyIntelPreviewErrorHandlers = [
  ...createCompanyIntelHandlers(),
];
companyIntelPreviewErrorHandlers.splice(
  1,
  1,
  http.post(`${API_BASE}/preview`, async () => {
    await delay(180);
    return HttpResponse.json(
      {
        error: {
          message: 'Upstream preview service is currently unavailable.',
        },
      },
      { status: 502 },
    );
  }),
);

export const companyIntelSlowPreviewHandlers = [
  ...createCompanyIntelHandlers(),
];
companyIntelSlowPreviewHandlers.splice(
  1,
  1,
  http.post(`${API_BASE}/preview`, async () => {
    await delay(4000);
    return HttpResponse.json({ data: companyIntelPreviewFixture });
  }),
);
