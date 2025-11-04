// ------------------------------------------------------------------------------------------------
//                ScrapeResults.tsx - Lists individual scrape cards with contextual stats
// ------------------------------------------------------------------------------------------------

import type { ReactElement } from 'react';
import { Fragment } from 'react';
import { Badge } from '@agenai/ui/badge';
import { Separator } from '@agenai/ui/separator';
import type { SnapshotScrapeViewModel } from '../../hooks/useSnapshotDetails';
import { ScrapeCard } from './ScrapeCard';

interface ScrapeResultsProps {
  readonly scrapes: readonly SnapshotScrapeViewModel[];
  readonly totalScrapes: number;
  readonly successfulScrapes: number;
  readonly failedScrapes: number;
}

export function ScrapeResults({
  scrapes,
  totalScrapes,
  successfulScrapes,
  failedScrapes,
}: ScrapeResultsProps): ReactElement {
  const hasScrapes = scrapes.length > 0;

  return (
    <section className="space-y-5 rounded-2xl border border-border/60 bg-muted/10 p-6 shadow-sm">
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold text-foreground">Scrape results</p>
          <Badge variant="outline" className="text-xs">
            {totalScrapes} page{totalScrapes === 1 ? '' : 's'}
          </Badge>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span>Successful {successfulScrapes}</span>
          <span>Failed {failedScrapes}</span>
          <span>Captured {totalScrapes} URLs</span>
        </div>
      </div>

      <Separator />

      <div className="space-y-4">
        {hasScrapes ? (
          scrapes.map((viewModel: SnapshotScrapeViewModel) => (
            <Fragment key={viewModel.scrape.url}>
              <ScrapeCard viewModel={viewModel} />
            </Fragment>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">No scrape data captured for this snapshot.</p>
        )}
      </div>
    </section>
  );
}
