// ------------------------------------------------------------------------------------------------
//                SnapshotsPanel.tsx - Collection history list with snapshot summaries
// ------------------------------------------------------------------------------------------------

import React, { type ReactElement } from 'react';
import { History } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@company-intel/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@company-intel/ui/card';
import { ScrollArea } from '@company-intel/ui/scroll-area';
import { Skeleton } from '@company-intel/ui/skeleton';
import type { CompanyProfileSnapshot } from '../../types';
import { SnapshotCard } from './components/SnapshotCard';

interface SnapshotsPanelProps {
  readonly snapshots: readonly CompanyProfileSnapshot[];
  readonly isLoading: boolean;
  readonly isError: boolean;
  readonly onSnapshotLoad: (snapshotId: number) => Promise<void> | void;
  readonly loadingSnapshotId: number | null;
  readonly activeSnapshotId: number | null;
  readonly disableSnapshotLoad?: boolean;
}

export function SnapshotsPanel({
  snapshots,
  isLoading,
  isError,
  onSnapshotLoad,
  loadingSnapshotId,
  activeSnapshotId,
  disableSnapshotLoad = false,
}: SnapshotsPanelProps): ReactElement {
  const hasSnapshots = snapshots.length > 0;

  return (
    <Card className="w-full">
      <CardHeader className="space-y-2">
        <div className="flex items-center gap-2 text-base text-foreground">
          <History className="h-4 w-4 text-muted-foreground" aria-hidden />
          <CardTitle>Run history</CardTitle>
        </div>
        <CardDescription>
          Chronological log of mapping and scrape attempts so your collections stay auditable.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="space-y-3">
            {[0, 1, 2].map(skeletonKey => (
              <Skeleton key={skeletonKey} className="h-24 w-full rounded-xl" />
            ))}
          </div>
        ) : isError ? (
          <Alert variant="destructive">
            <AlertTitle>Unable to load history</AlertTitle>
            <AlertDescription>
              There was a problem retrieving recent runs. Please try again shortly.
            </AlertDescription>
          </Alert>
        ) : hasSnapshots ? (
          <ScrollArea className="h-[24rem] sm:h-[26rem] lg:h-[28rem] pr-2">
            <ul className="space-y-3">
              {snapshots.map((snapshot, index) => (
                <SnapshotCard
                  key={snapshot.id}
                  snapshot={snapshot}
                  isLast={index === snapshots.length - 1}
                  onLoadSnapshot={onSnapshotLoad}
                  isActive={activeSnapshotId === snapshot.id}
                  isLoading={loadingSnapshotId === snapshot.id}
                  disableLoad={disableSnapshotLoad}
                />
              ))}
            </ul>
          </ScrollArea>
        ) : (
          <div className="rounded-xl border border-dashed border-border/60 bg-muted/5 p-6 text-center text-sm text-muted-foreground">
            No runs yet. Trigger a collection to build your audit trail.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
