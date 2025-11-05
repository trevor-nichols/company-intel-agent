import { NextRequest } from 'next/server';
import { logger } from '@agenai/logging';

import { getCompanyIntelEnvironment } from '@/server/bootstrap';
import type { CompanyIntelStreamEvent } from '@/shared/company-intel/types';
import type { RunSubscription } from '@/server/runtime/runCoordinator';

const textEncoder = new TextEncoder();

export async function GET(request: NextRequest, context: { params: { snapshotId: string } }) {
  const snapshotIdRaw = context.params.snapshotId;
  const snapshotId = Number.parseInt(snapshotIdRaw, 10);

  if (!Number.isFinite(snapshotId)) {
    return new Response(
      JSON.stringify({ error: 'Invalid snapshot id' }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }

  const { runtime } = getCompanyIntelEnvironment();
  const activeRun = runtime.getActiveRunBySnapshot(snapshotId);

  if (!activeRun || activeRun.status !== 'running') {
    return new Response(
      JSON.stringify({ error: 'No active run found for the provided snapshot id.' }),
      {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }

  let streamSubscription: RunSubscription | null = null;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const write = (payload: string) => controller.enqueue(textEncoder.encode(payload));
      const sendEvent = (event: CompanyIntelStreamEvent | { readonly type: string; readonly [key: string]: unknown }) => {
        try {
          write(`data: ${JSON.stringify(event)}\n\n`);
        } catch (error) {
          const eventType = typeof event === 'object' && event !== null && 'type' in event ? (event as { type?: string }).type : undefined;
          logger.error('company-intel:sse:write-error', {
            eventType: typeof eventType === 'string' ? eventType : 'unknown',
            error,
          });
        }
      };
      const sendDone = () => write('data: [DONE]\n\n');

      let lastDomain = activeRun.domain;
      let isClosed = false;

      const closeStream = () => {
        if (!isClosed) {
          isClosed = true;
          controller.close();
        }
      };

      const abortHandler = () => {
        streamSubscription?.unsubscribe();
        streamSubscription = null;
        closeStream();
      };

      request.signal.addEventListener('abort', abortHandler, { once: true });

      streamSubscription = runtime.subscribe(snapshotId, event => {
        if (event.domain) {
          lastDomain = event.domain;
        }
        sendEvent(event);
        if (event.type === 'run-complete' || event.type === 'run-error' || event.type === 'run-cancelled') {
          streamSubscription?.unsubscribe();
          streamSubscription = null;
          sendDone();
          closeStream();
          request.signal.removeEventListener('abort', abortHandler);
        }
      }, { replay: true });

      if (!streamSubscription) {
        sendEvent({
          type: 'run-error',
          snapshotId,
          domain: lastDomain,
          message: 'Unable to attach to company intel run',
        });
        sendDone();
        closeStream();
        request.signal.removeEventListener('abort', abortHandler);
      }
    },
    cancel() {
      streamSubscription?.unsubscribe();
      streamSubscription = null;
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}

