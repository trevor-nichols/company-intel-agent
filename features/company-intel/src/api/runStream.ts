import type { CompanyIntelRunCoordinator, RunSubscription } from '../server/runtime/runCoordinator';
import { ActiveRunError } from '../server/runtime/runCoordinator';
import type { CollectSiteIntelOptions } from '../server/web-search';
import type { CompanyIntelStreamEvent } from '../shared/types';
import { logger as defaultLogger } from '../config/logging';
import { error, type HttpResult } from './http';

const textEncoder = new TextEncoder();

export interface RunStreamParams {
  readonly domain: string;
  readonly options?: CollectSiteIntelOptions;
}

export interface RunStreamDependencies {
  readonly runtime: CompanyIntelRunCoordinator;
  readonly logger?: typeof defaultLogger;
}

export interface RunStreamOptions {
  readonly signal?: AbortSignal;
}

export type RunStreamResult =
  | { ok: true; stream: ReadableStream<Uint8Array>; snapshotId: number }
  | { ok: false; response: HttpResult };

export async function createRunStream(
  params: RunStreamParams,
  dependencies: RunStreamDependencies,
  options: RunStreamOptions = {},
): Promise<RunStreamResult> {
  const log = dependencies.logger ?? defaultLogger;
  let startResult;
  try {
    startResult = await dependencies.runtime.startRun(params);
  } catch (err) {
    if (err instanceof ActiveRunError) {
      return {
        ok: false,
        response: {
          status: 409,
          body: {
            error: 'Company intel run already in progress for this domain.',
            snapshotId: err.snapshotId,
          },
        },
      };
    }
    const message = err instanceof Error ? err.message : 'Unable to start company intel run';
    return { ok: false, response: error(message, 500) };
  }

  let streamSubscription: RunSubscription | null = null;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const write = (payload: string) => controller.enqueue(textEncoder.encode(payload));
      const sendEvent = (event: CompanyIntelStreamEvent | { readonly type: string; readonly [key: string]: unknown }) => {
        try {
          write(`data: ${JSON.stringify(event)}\n\n`);
        } catch (err) {
          const eventType = typeof event === 'object' && event !== null && 'type' in event ? (event as { type?: string }).type : undefined;
          log.error('company-intel:sse:write-error', {
            eventType: typeof eventType === 'string' ? eventType : 'unknown',
            error: err,
          });
        }
      };
      const sendDone = () => write('data: [DONE]\n\n');

      let lastDomain = startResult.domain;
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

      options.signal?.addEventListener('abort', abortHandler, { once: true });

      streamSubscription = dependencies.runtime.subscribe(startResult.snapshotId, event => {
        if (event.domain) {
          lastDomain = event.domain;
        }
        sendEvent(event);
        if (event.type === 'run-complete' || event.type === 'run-error' || event.type === 'run-cancelled') {
          streamSubscription?.unsubscribe();
          streamSubscription = null;
          sendDone();
          closeStream();
          options.signal?.removeEventListener('abort', abortHandler);
        }
      }, { replay: true });

      if (!streamSubscription) {
        sendEvent({
          type: 'run-error',
          snapshotId: startResult.snapshotId,
          domain: lastDomain,
          message: 'Unable to attach to company intel run',
        });
        sendDone();
        closeStream();
        options.signal?.removeEventListener('abort', abortHandler);
      }
    },
    cancel() {
      streamSubscription?.unsubscribe();
      streamSubscription = null;
    },
  });

  return {
    ok: true,
    stream,
    snapshotId: startResult.snapshotId,
  };
}

export function createExistingRunStream(
  snapshotId: number,
  dependencies: RunStreamDependencies,
  options: RunStreamOptions = {},
): RunStreamResult {
  if (!Number.isFinite(snapshotId) || snapshotId <= 0) {
    return { ok: false, response: error('Invalid snapshot id', 400) };
  }

  const activeRun = dependencies.runtime.getActiveRunBySnapshot(snapshotId);
  if (!activeRun || activeRun.status !== 'running') {
    return {
      ok: false,
      response: error('No active run found for the provided snapshot id.', 404),
    };
  }

  const log = dependencies.logger ?? defaultLogger;
  let streamSubscription: RunSubscription | null = null;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const write = (payload: string) => controller.enqueue(textEncoder.encode(payload));
      const sendEvent = (event: CompanyIntelStreamEvent | { readonly type: string; readonly [key: string]: unknown }) => {
        try {
          write(`data: ${JSON.stringify(event)}\n\n`);
        } catch (err) {
          const eventType = typeof event === 'object' && event !== null && 'type' in event ? (event as { type?: string }).type : undefined;
          log.error('company-intel:sse:write-error', {
            eventType: typeof eventType === 'string' ? eventType : 'unknown',
            error: err,
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

      options.signal?.addEventListener('abort', abortHandler, { once: true });

      streamSubscription = dependencies.runtime.subscribe(snapshotId, event => {
        if (event.domain) {
          lastDomain = event.domain;
        }
        sendEvent(event);
        if (event.type === 'run-complete' || event.type === 'run-error' || event.type === 'run-cancelled') {
          streamSubscription?.unsubscribe();
          streamSubscription = null;
          sendDone();
          closeStream();
          options.signal?.removeEventListener('abort', abortHandler);
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
        options.signal?.removeEventListener('abort', abortHandler);
      }
    },
    cancel() {
      streamSubscription?.unsubscribe();
      streamSubscription = null;
    },
  });

  return {
    ok: true,
    stream,
    snapshotId,
  };
}
