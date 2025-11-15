// ------------------------------------------------------------------------------------------------
//                context.ts - Shared run context utilities for modular stages
// ------------------------------------------------------------------------------------------------

import { logger as defaultLogger, type Logger } from '../../../config/logging';

import type { CompanyIntelRunStage, CompanyIntelStreamEvent } from '../../../shared/types';
import type { CompanyIntelPersistence } from '../persistence';
import type { CompanyIntelSnapshotRecord } from '../persistence';
import { CompanyIntelRunCancelledError } from './errors';

export interface RunContextConfig {
  readonly logger?: Logger;
  readonly persistence: CompanyIntelPersistence;
  readonly emit?: (event: CompanyIntelStreamEvent) => void;
  readonly abortSignal?: AbortSignal;
  readonly snapshot: CompanyIntelSnapshotRecord;
  readonly initialDomain: string;
}

interface PersistProgressParams {
  readonly stage: CompanyIntelRunStage;
  readonly completed?: number;
  readonly total?: number;
}

export class RunContext {
  private readonly log: Logger;
  private readonly persistence: CompanyIntelPersistence;
  private readonly emitCallback?: (event: CompanyIntelStreamEvent) => void;
  private readonly abortSignal?: AbortSignal;
  private readonly snapshotId: number;
  private currentDomain: string;
  private isTerminated = false;
  private cancellationReason: string | null = null;

  constructor(config: RunContextConfig) {
    this.log = config.logger ?? defaultLogger;
    this.persistence = config.persistence;
    this.emitCallback = config.emit;
    this.abortSignal = config.abortSignal;
    this.snapshotId = config.snapshot.id;
    this.currentDomain = config.initialDomain;

    if (this.abortSignal) {
      this.abortSignal.addEventListener(
        'abort',
        () => {
          if (this.cancellationReason) {
            return;
          }
          const reason = typeof this.abortSignal?.reason === 'string' && this.abortSignal.reason.length > 0
            ? this.abortSignal.reason
            : 'Run cancelled by user';
          this.cancellationReason = reason;
          this.log.debug('company-intel:run:abort-signal-received', {
            domain: this.currentDomain,
          });
        },
        { once: true },
      );
    }
  }

  get logger(): Logger {
    return this.log;
  }

  get snapshot(): number {
    return this.snapshotId;
  }

  get domain(): string {
    return this.currentDomain;
  }

  getCancellationReason(): string | null {
    return this.cancellationReason;
  }

  updateDomain(domain: string): void {
    this.currentDomain = domain;
  }

  throwIfCancelled(stage: CompanyIntelRunStage | string): void {
    if (!this.abortSignal?.aborted) {
      return;
    }

    const reason = typeof this.abortSignal.reason === 'string' && this.abortSignal.reason.length > 0
      ? this.abortSignal.reason
      : this.cancellationReason ?? 'Run cancelled by user';
    this.cancellationReason = reason;
    this.log.info('company-intel:run:aborted', {
      domain: this.currentDomain,
      stage,
    });
    throw new CompanyIntelRunCancelledError(reason);
  }

  emitEvent(event: Record<string, unknown> & { readonly type: CompanyIntelStreamEvent['type']; readonly domain?: string }): void {
    if (!this.emitCallback) {
      return;
    }

    const payload: CompanyIntelStreamEvent = {
      snapshotId: this.snapshotId,
      domain: event.domain ?? this.currentDomain,
      ...event,
    } as CompanyIntelStreamEvent;

    if (payload.type === 'run-complete' || payload.type === 'run-error' || payload.type === 'run-cancelled') {
      this.isTerminated = true;
    }

    this.emitCallback(payload);
  }

  emitStage(stage: CompanyIntelRunStage, progress?: { readonly completed?: number; readonly total?: number }): void {
    if (!this.isTerminated) {
      void this.persistProgress({
        stage,
        completed: progress?.completed,
        total: progress?.total,
      });
    }

    this.emitEvent({
      type: 'status',
      stage,
      ...(progress?.completed !== undefined ? { completed: progress.completed } : {}),
      ...(progress?.total !== undefined ? { total: progress.total } : {}),
    });
  }

  private async persistProgress(params: PersistProgressParams): Promise<void> {
    try {
      await this.persistence.updateSnapshot(this.snapshotId, {
        progress: {
          stage: params.stage,
          completed: params.completed,
          total: params.total,
          updatedAt: new Date(),
        },
      });
    } catch (error) {
      this.log.warn('company-intel:persistence:progress-error', {
        snapshotId: this.snapshotId,
        stage: params.stage,
        error: error instanceof Error ? { name: error.name, message: error.message } : error ?? null,
      });
    }
  }

  async updateSnapshot(updates: Parameters<CompanyIntelPersistence['updateSnapshot']>[1]): Promise<void> {
    await this.persistence.updateSnapshot(this.snapshotId, updates);
  }

  async replaceSnapshotPages(pages: Parameters<CompanyIntelPersistence['replaceSnapshotPages']>[1]): Promise<void> {
    await this.persistence.replaceSnapshotPages(this.snapshotId, pages);
  }

  async upsertProfile(params: Parameters<CompanyIntelPersistence['upsertProfile']>[0]) {
    return this.persistence.upsertProfile(params);
  }

  async getProfile() {
    return this.persistence.getProfile();
  }

  async deleteSnapshot(): Promise<void> {
    await this.persistence.deleteSnapshot(this.snapshotId);
  }

  markTerminated(): void {
    this.isTerminated = true;
  }

  isRunTerminated(): boolean {
    return this.isTerminated;
  }
}
