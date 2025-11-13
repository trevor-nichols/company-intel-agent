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
  readonly chatStreamEvents?: ReadonlyArray<Record<string, unknown>> | null;
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
    (summaries?.metadata as { structuredProfile?: { headlines?: readonly string[] } })?.structuredProfile?.headlines?.[0] ??
    'Framing differentiators for revenue intelligence';
  const overviewText = (summaries?.overview as string | undefined) ??
    'Acme Intel Systems helps revenue leaders act on competitive shifts faster than the market moves.';
  const overviewHeadline =
    (summaries?.metadata as { overview?: { headlines?: readonly string[] } })?.overview?.headlines?.[0] ??
    'Summarising why Acme accelerates GTM teams';
  const baseEvent = {
    snapshotId: triggerResult.snapshotId,
    domain,
  };

  const structuredDeltaSeed = structuredProfile ? JSON.stringify(structuredProfile) : '{}';

  return [
    {
      ...baseEvent,
      type: 'snapshot-created',
      status: 'running',
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
      headlines: [overviewHeadline],
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
      headlines: [structuredHeadline],
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
          headlines: [structuredHeadline],
          summary: 'Focus on key differentiators and explain how briefs reduce cycle time for exec decisions.',
        },
        reasoningHeadlines: [structuredHeadline],
      },
    },
    {
      ...baseEvent,
      type: 'overview-complete',
      overview: overviewText,
      headlines: [overviewHeadline],
    },
    {
      ...baseEvent,
      type: 'run-complete',
      result: triggerResult,
    },
  ];
}

function createDefaultChatStreamEvents(snapshotId: number) {
  const baseEvent = {
    snapshotId,
    responseId: 'resp_story_chat',
  };

  return [
    {
      ...baseEvent,
      type: 'chat-stream-start',
      model: 'gpt-5-story',
    },
    {
      ...baseEvent,
      type: 'chat-reasoning-delta',
      summaryIndex: 0,
      delta: 'Comparing mapping summary with scraped snippets… ',
    },
    {
      ...baseEvent,
      type: 'chat-reasoning-summary',
      summaryIndex: 0,
      text: '**Reconcile sources**\n\nCross-check value props against mapped selections, then respond with the clearest articulation.',
      headline: 'Reasoning through the answer',
    },
    {
      ...baseEvent,
      type: 'chat-tool-status',
      tool: 'file_search',
      status: 'searching',
    },
    {
      ...baseEvent,
      type: 'chat-tool-status',
      tool: 'file_search',
      status: 'completed',
    },
    {
      ...baseEvent,
      type: 'chat-message-delta',
      delta: 'Acme’s snapshot positions the platform as ',
    },
    {
      ...baseEvent,
      type: 'chat-message-complete',
      message: 'Acme’s snapshot positions the platform as the fastest path to GTM-ready intel by combining automated mapping with curated human QA.',
      citations: [],
    },
    {
      ...baseEvent,
      type: 'chat-usage',
      usage: { total_tokens: 128 },
    },
    {
      ...baseEvent,
      type: 'chat-complete',
    },
  ] as const;
}

export const createCompanyIntelHandlers = ({
  payload = companyIntelApiPayload,
  preview = companyIntelPreviewFixture,
  triggerResult = triggerCompanyIntelResultFixture,
  streamEvents,
  chatStreamEvents,
}: CompanyIntelHandlerOptions = {}) => {
  const resolvedPayload = payload ?? companyIntelApiPayload;
  const resolvedTrigger = triggerResult ?? triggerCompanyIntelResultFixture;
  const resolvedStreamEvents =
    streamEvents === undefined
      ? createDefaultStreamEvents(resolvedTrigger, resolvedPayload)
      : streamEvents ?? [];
  const resolvedChatEvents =
    chatStreamEvents === undefined
      ? createDefaultChatStreamEvents(resolvedTrigger.snapshotId)
      : chatStreamEvents;

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
      if (!accept.includes('text/event-stream')) {
        return HttpResponse.json(
          { error: { message: 'Streaming required for Company Intel runs.' } },
          { status: 406 },
        );
      }

      const events = resolvedStreamEvents ?? [];
      return new HttpResponse(createEventStream(events), {
        headers: {
          'Content-Type': 'text/event-stream',
          Connection: 'keep-alive',
          'Cache-Control': 'no-cache',
        },
      });
    }),
    http.post(`${API_BASE}/snapshots/:id/chat/stream`, async ({ params }) => {
      const rawParam = params.id;
      const idRaw = Array.isArray(rawParam) ? rawParam[0] ?? '' : rawParam ?? '';
      const parsedId = Number.parseInt(idRaw, 10);
      const snapshotId = Number.isFinite(parsedId) ? parsedId : resolvedTrigger.snapshotId;
      const events = resolvedChatEvents ?? createDefaultChatStreamEvents(snapshotId);
      return new HttpResponse(createEventStream(events), {
        headers: {
          'Content-Type': 'text/event-stream',
          Connection: 'keep-alive',
          'Cache-Control': 'no-cache',
        },
      });
    }),
  ] as const;
};

export const companyIntelHandlers = createCompanyIntelHandlers();

export const companyIntelEmptyHandlers = createCompanyIntelHandlers({
  payload: emptyCompanyIntelApiPayload,
  preview: emptyCompanyIntelPreviewFixture,
  triggerResult: triggerCompanyIntelEmptyResultFixture,
});

const companyIntelPreviewErrorHandlers = [
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

const companyIntelSlowPreviewHandlers = [
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
