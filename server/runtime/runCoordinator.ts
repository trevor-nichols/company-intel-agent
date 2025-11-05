// ------------------------------------------------------------------------------------------------
//                runCoordinator.ts - Coordinates live run sessions for SSE streaming
// ------------------------------------------------------------------------------------------------

import { logger as defaultLogger } from '@agenai/logging';

import type { CompanyIntelServer } from '../bridge';
import type { RunCompanyIntelCollectionParams, RunCompanyIntelCollectionResult } from '../services/run-collection';
import { CompanyIntelRunCancelledError } from '../services/run-collection';
import type { RunCollectionOverrides } from '../bridge';
import type { CompanyIntelStreamEvent } from '@/shared/company-intel/types';

type RunSessionListener = (event: CompanyIntelStreamEvent) => void;

interface RunSession {
  snapshotId: number | null;
  domain: string;
  domainKey: string;
  readonly startedAt: Date;
  readonly controller: AbortController;
  readonly listeners: Set<RunSessionListener>;
  readonly buffer: CompanyIntelStreamEvent[];
  runPromise: Promise<RunCompanyIntelCollectionResult>;
  cleanupTimer: NodeJS.Timeout | null;
  status: 'running' | 'complete' | 'failed' | 'cancelled';
}

export interface RunSubscription {
  readonly unsubscribe: () => void;
}

export interface ActiveRunSummary {
  readonly snapshotId: number | null;
  readonly domain: string;
  readonly startedAt: Date;
  readonly status: RunSession['status'];
}

export class ActiveRunError extends Error {
  readonly snapshotId: number | null;
  readonly domain: string;

  constructor(message: string, domain: string, snapshotId: number | null) {
    super(message);
    this.name = 'ActiveRunError';
    this.domain = domain;
    this.snapshotId = snapshotId;
  }
}

const CLEANUP_DELAY_MS = 30_000;

export interface CompanyIntelRunCoordinatorDependencies {
  readonly server: CompanyIntelServer;
  readonly logger?: typeof defaultLogger;
}

export class CompanyIntelRunCoordinator {
  private readonly server: CompanyIntelServer;
  private readonly log: typeof defaultLogger;
  private readonly sessionsBySnapshot = new Map<number, RunSession>();
  private readonly sessionsByDomain = new Map<string, RunSession>();

  constructor(dependencies: CompanyIntelRunCoordinatorDependencies) {
    this.server = dependencies.server;
    this.log = dependencies.logger ?? defaultLogger;
  }

  getActiveRunForDomain(domain: string): ActiveRunSummary | null {
    const domainKey = this.normaliseDomainKey(domain);
    const session = this.sessionsByDomain.get(domainKey);
    if (!session) {
      return null;
    }

    return {
      snapshotId: session.snapshotId,
      domain: session.domain,
      startedAt: session.startedAt,
      status: session.status,
    };
  }

  getActiveRunBySnapshot(snapshotId: number): ActiveRunSummary | null {
    const session = this.sessionsBySnapshot.get(snapshotId);
    if (!session) {
      return null;
    }
    return {
      snapshotId: session.snapshotId,
      domain: session.domain,
      startedAt: session.startedAt,
      status: session.status,
    };
  }

  async startRun(
    params: RunCompanyIntelCollectionParams,
    overrides: RunCollectionOverrides = {},
  ): Promise<{ readonly snapshotId: number; readonly domain: string; readonly startedAt: Date }> {
    const domainKey = this.normaliseDomainKey(params.domain);
    const existing = this.sessionsByDomain.get(domainKey);
    if (existing) {
      if (existing.status === 'running') {
        throw new ActiveRunError('A company intel run is already in progress for this domain.', existing.domain, existing.snapshotId);
      }

      this.cleanupSession(existing);
    }

    const controller = new AbortController();
    const listeners = new Set<RunSessionListener>();
    const buffer: CompanyIntelStreamEvent[] = [];
    let resolved = false;
    let resolveSnapshot: ((value: { snapshotId: number; domain: string; startedAt: Date }) => void) | null = null;
    let rejectSnapshot: ((error: Error) => void) | null = null;

    const snapshotReady = new Promise<{ snapshotId: number; domain: string; startedAt: Date }>((resolve, reject) => {
      resolveSnapshot = resolve;
      rejectSnapshot = reject;
    });

    const session: RunSession = {
      snapshotId: null,
      domain: params.domain,
      domainKey,
      startedAt: new Date(),
      controller,
      listeners,
      buffer,
      cleanupTimer: null,
      status: 'running',
      runPromise: Promise.resolve(null as unknown as RunCompanyIntelCollectionResult),
    };

    const emitEvent = (event: CompanyIntelStreamEvent) => {
      if (session.snapshotId === null) {
        session.snapshotId = event.snapshotId;
        this.sessionsBySnapshot.set(event.snapshotId, session);
        if (!resolved && resolveSnapshot) {
          resolved = true;
          resolveSnapshot({ snapshotId: event.snapshotId, domain: event.domain, startedAt: session.startedAt });
        }
      }
      this.updateSessionDomain(session, event.domain);
      this.handleEvent(session, event);
    };

    session.runPromise = this.server.runCollection(params, {
      ...overrides,
      abortSignal: controller.signal,
      onEvent: emitEvent,
    });
    const runPromise = session.runPromise;

    this.sessionsByDomain.set(domainKey, session);

    runPromise
      .then(result => {
        if (session.snapshotId === null) {
          session.snapshotId = result.snapshotId;
          this.sessionsBySnapshot.set(result.snapshotId, session);
        }
        if (!resolved && resolveSnapshot) {
          resolved = true;
          resolveSnapshot({ snapshotId: result.snapshotId, domain: session.domain, startedAt: session.startedAt });
        }
      })
      .catch(error => {
        if (!resolved && rejectSnapshot) {
          resolved = true;
          rejectSnapshot(error instanceof Error ? error : new Error('Company intel run failed before snapshot was created'));
        }
        if (!(error instanceof CompanyIntelRunCancelledError)) {
          this.log.error('company-intel:runtime:run-error', {
            domain: session.domain,
            snapshotId: session.snapshotId,
            error: error instanceof Error ? { name: error.name, message: error.message } : error ?? null,
          });
        }
        const hasSnapshot = session.snapshotId !== null;
        if (!hasSnapshot) {
          session.status = error instanceof CompanyIntelRunCancelledError ? 'cancelled' : 'failed';
          this.cleanupSession(session);
        }
      })
      .finally(() => {
        if (session.status === 'running') {
          this.scheduleCleanup(session);
        }
      });

    return snapshotReady;
  }

  async runToCompletion(
    params: RunCompanyIntelCollectionParams,
    overrides: RunCollectionOverrides = {},
  ): Promise<RunCompanyIntelCollectionResult> {
    const { snapshotId } = await this.startRun(params, overrides);
    const session = this.sessionsBySnapshot.get(snapshotId);
    if (!session) {
      throw new Error('Unable to locate active run session.');
    }

    return session.runPromise;
  }

  subscribe(snapshotId: number, listener: RunSessionListener, options: { readonly replay?: boolean } = {}): RunSubscription | null {
    const session = this.sessionsBySnapshot.get(snapshotId);
    if (!session) {
      return null;
    }

    if (options.replay !== false) {
      for (const event of session.buffer) {
        listener(event);
      }
    }

    session.listeners.add(listener);

    return {
      unsubscribe: () => {
        session.listeners.delete(listener);
      },
    };
  }

  cancel(snapshotId: number, reason?: string): boolean {
    const session = this.sessionsBySnapshot.get(snapshotId);
    if (!session) {
      return false;
    }
    if (session.status !== 'running') {
      return false;
    }
    const abortReason = reason ?? 'Run cancelled by user';
    session.controller.abort(abortReason);
    return true;
  }

  private handleEvent(session: RunSession, event: CompanyIntelStreamEvent): void {
    if (session.cleanupTimer) {
      clearTimeout(session.cleanupTimer);
      session.cleanupTimer = null;
    }

    if (session.snapshotId === null || session.snapshotId === -1) {
      session.snapshotId = event.snapshotId;
      this.sessionsBySnapshot.set(event.snapshotId, session);
    }

    this.updateSessionDomain(session, event.domain);

    const cloned = this.cloneEvent(event);
    session.buffer.push(cloned);
    for (const listener of session.listeners) {
      try {
        listener(cloned);
      } catch (error) {
        this.log.warn('company-intel:runtime:listener-error', {
          snapshotId: session.snapshotId,
          domain: session.domain,
          error: error instanceof Error ? { name: error.name, message: error.message } : error ?? null,
        });
      }
    }

    if (event.type === 'run-complete') {
      session.status = 'complete';
      this.scheduleCleanup(session);
    } else if (event.type === 'run-error') {
      session.status = 'failed';
      this.scheduleCleanup(session);
    } else if (event.type === 'run-cancelled') {
      session.status = 'cancelled';
      this.scheduleCleanup(session);
    }
  }

  private scheduleCleanup(session: RunSession): void {
    if (session.cleanupTimer) {
      clearTimeout(session.cleanupTimer);
    }

    session.cleanupTimer = setTimeout(() => {
      this.cleanupSession(session);
    }, CLEANUP_DELAY_MS);
  }

  private cleanupSession(session: RunSession): void {
    if (session.cleanupTimer) {
      clearTimeout(session.cleanupTimer);
      session.cleanupTimer = null;
    }

    if (session.snapshotId !== null) {
      this.sessionsBySnapshot.delete(session.snapshotId);
    }
    this.sessionsByDomain.delete(session.domainKey);
    session.listeners.clear();
    session.buffer.length = 0;
  }

  private updateSessionDomain(session: RunSession, nextDomain: string): void {
    const candidate = typeof nextDomain === 'string' ? nextDomain.trim() : '';
    if (!candidate || candidate === session.domain) {
      if (candidate) {
        session.domain = candidate;
      }
      return;
    }

    const nextKey = this.normaliseDomainKey(candidate);
    if (nextKey === session.domainKey) {
      session.domain = candidate;
      return;
    }

    const previousKey = session.domainKey;
    this.sessionsByDomain.delete(previousKey);
    session.domain = candidate;
    session.domainKey = nextKey;
    const existing = this.sessionsByDomain.get(nextKey);
    if (!existing) {
      this.sessionsByDomain.set(nextKey, session);
      return;
    }

    if (existing === session) {
      this.sessionsByDomain.set(nextKey, session);
      return;
    }

    const existingPriority = existing.status === 'running' ? 1 : 0;
    const sessionPriority = session.status === 'running' ? 1 : 0;

    if (sessionPriority > existingPriority) {
      this.sessionsByDomain.set(nextKey, session);
      return;
    }

    if (sessionPriority === existingPriority) {
      const existingTime = existing.startedAt.getTime();
      const sessionTime = session.startedAt.getTime();
      if (sessionTime < existingTime) {
        this.sessionsByDomain.set(nextKey, session);
        return;
      }
    }

    if (!this.sessionsByDomain.has(previousKey)) {
      this.sessionsByDomain.set(previousKey, session);
    }
  }

  private normaliseDomainKey(domain: string): string {
    const trimmed = domain.trim();
    if (!trimmed) {
      return '';
    }

    const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    try {
      const parsed = new URL(withScheme);
      const normalizedPath = parsed.pathname === '/' ? '' : parsed.pathname.replace(/\/+$|$/u, '');
      const canonical = `${parsed.origin}${normalizedPath}`;
      return canonical.toLowerCase();
    } catch {
      return withScheme.toLowerCase();
    }
  }

  private cloneEvent(event: CompanyIntelStreamEvent): CompanyIntelStreamEvent {
    return JSON.parse(JSON.stringify(event)) as CompanyIntelStreamEvent;
  }
}
