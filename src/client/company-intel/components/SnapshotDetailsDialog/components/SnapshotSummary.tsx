// ------------------------------------------------------------------------------------------------
//                SnapshotSummary.tsx - High-level snapshot metadata chips and badges
// ------------------------------------------------------------------------------------------------

import type { ReactElement } from 'react';
import { Badge } from '@agenai/ui/badge';
import type { CompanyProfileSnapshot } from '../../../types';
import { formatDateTime, formatStatusLabel, getStatusVariant } from '../../../utils/formatters';

interface SnapshotSummaryProps {
  readonly snapshot: CompanyProfileSnapshot;
  readonly totalScrapes: number;
  readonly successfulScrapes: number;
  readonly failedScrapes: number;
}

export function SnapshotSummary({
  snapshot,
  totalScrapes,
  successfulScrapes,
  failedScrapes,
}: SnapshotSummaryProps): ReactElement {
  return (
    <div className="grid gap-2 text-sm text-muted-foreground">
      <div className="flex flex-wrap items-center gap-3">
        <Badge variant={getStatusVariant(snapshot.status)}>{formatStatusLabel(snapshot.status)}</Badge>
        <span>
          Created {formatDateTime(snapshot.createdAt)}
        </span>
        {snapshot.completedAt ? (
          <span>Completed {formatDateTime(snapshot.completedAt)}</span>
        ) : (
          <span>In progress</span>
        )}
        {snapshot.error ? <Badge variant="destructive">Error: {snapshot.error}</Badge> : null}
      </div>
      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">Domain:</span>
        <span>{snapshot.domain ?? '—'}</span>
        <span className="font-medium text-foreground">Pages:</span>
        <span>{totalScrapes}</span>
        <span className="font-medium text-foreground">Success:</span>
        <span>{successfulScrapes}</span>
        <span className="font-medium text-foreground">Failures:</span>
        <span>{failedScrapes}</span>
      </div>
    </div>
  );
}
