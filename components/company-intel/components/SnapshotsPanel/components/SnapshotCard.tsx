// ------------------------------------------------------------------------------------------------
//                SnapshotCard.tsx - Individual snapshot summary within collection history
// ------------------------------------------------------------------------------------------------

import React, { type ReactElement } from 'react';
import { Badge } from '@agenai/ui/badge';
import type { CompanyProfileSnapshot } from '../../../types';
import { formatDate, formatStatusLabel, getStatusVariant } from '../../../utils/formatters';

interface SnapshotCardProps {
  readonly snapshot: CompanyProfileSnapshot;
  readonly isLast: boolean;
}

export function SnapshotCard({ snapshot, isLast }: SnapshotCardProps): ReactElement {
  const successful = snapshot.rawScrapes.filter(scrape => scrape.success).length;
  const total = snapshot.rawScrapes.length;
  const failures = total - successful;

  return (
    <li className="flex gap-3">
      <div className="flex w-3 flex-col items-center">
        <span
          className="mt-1 h-2.5 w-2.5 rounded-full bg-red-500/80 shadow-[0_0_0_4px_rgba(244,63,94,0.18)]"
          aria-hidden
        />
        {!isLast ? <span className="mt-1 h-full w-px bg-border/50" aria-hidden /> : null}
      </div>
      <div className="flex-1 rounded-xl border border-border/40 bg-background/95 p-4 shadow-sm backdrop-blur-sm transition hover:border-border">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <Badge variant={getStatusVariant(snapshot.status)}>{formatStatusLabel(snapshot.status)}</Badge>
            <span className="font-medium text-foreground">Snapshot #{snapshot.id}</span>
          </div>
          <span className="text-xs text-muted-foreground">{formatDate(snapshot.createdAt)}</span>
        </div>

        <dl className="mt-4 grid gap-3 text-xs text-muted-foreground sm:grid-cols-2">
          <div className="space-y-1">
            <dt className="font-medium text-foreground">Status</dt>
            <dd>{snapshot.completedAt ? `Completed ${formatDate(snapshot.completedAt)}` : 'In progress…'}</dd>
          </div>
          <div className="space-y-1">
            <dt className="font-medium text-foreground">Domain</dt>
            <dd>{snapshot.domain ?? '—'}</dd>
          </div>
          <div className="space-y-1">
            <dt className="font-medium text-foreground">Selected pages</dt>
            <dd>{snapshot.selectedUrls.length}</dd>
          </div>
          {total > 0 ? (
            <div className="space-y-1">
              <dt className="font-medium text-foreground">Result</dt>
              <dd>
                Success {successful}
                <span className="px-1">·</span>
                Failed {failures}
              </dd>
            </div>
          ) : null}
        </dl>

        {snapshot.error ? (
          <div className="mt-3 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
            Error: {snapshot.error}
          </div>
        ) : null}
      </div>
    </li>
  );
}
