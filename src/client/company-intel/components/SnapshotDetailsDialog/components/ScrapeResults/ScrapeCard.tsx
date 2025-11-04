// ------------------------------------------------------------------------------------------------
//                ScrapeCard.tsx - Individual scrape result presentation card
// ------------------------------------------------------------------------------------------------

import type { ReactElement } from 'react';
import { Badge } from '@agenai/ui/badge';
import type { SnapshotScrapeViewModel } from '../../hooks/useSnapshotDetails';
import { ScrapeFailureDetails } from './ScrapeFailureDetails';
import { ScrapeSuccessContent } from './ScrapeSuccessContent';

interface ScrapeCardProps {
  readonly viewModel: SnapshotScrapeViewModel;
}

export function ScrapeCard({ viewModel }: ScrapeCardProps): ReactElement {
  const { scrape, primaryDocument, content, hasImages, imageCount } = viewModel;
  const durationSeconds = (scrape.durationMs / 1000).toFixed(2);
  const apiDuration = scrape.response?.responseTime ? scrape.response.responseTime.toFixed(2) : null;
  const requestId = scrape.response?.requestId ?? null;

  return (
    <article className="space-y-4 rounded-2xl border border-border/50 bg-background/90 p-5 shadow-sm backdrop-blur">
      <header className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <span className="block break-words font-mono text-[11px] text-muted-foreground">{scrape.url}</span>
          <dl className="flex flex-wrap gap-3 text-[11px] text-muted-foreground">
            <div className="flex items-center gap-1">
              <dt className="font-medium text-foreground">Duration:</dt>
              <dd>{durationSeconds}s</dd>
            </div>
            {apiDuration ? (
              <div className="flex items-center gap-1">
                <dt className="font-medium text-foreground">API:</dt>
                <dd>{apiDuration}s</dd>
              </div>
            ) : null}
            {requestId ? (
              <div className="flex items-center gap-1">
                <dt className="font-medium text-foreground">Request ID:</dt>
                <dd className="font-mono">{requestId}</dd>
              </div>
            ) : null}
            <div className="flex items-center gap-1">
              <dt className="font-medium text-foreground">Images:</dt>
              <dd>{hasImages ? imageCount : 0}</dd>
            </div>
          </dl>
        </div>
        <Badge variant={scrape.success ? 'default' : 'destructive'} className="self-start">
          {scrape.success ? 'Success' : 'Failed'}
        </Badge>
      </header>

      {scrape.success ? (
        <ScrapeSuccessContent
          content={content}
          primaryDocument={primaryDocument}
          hasImages={hasImages}
          imageCount={imageCount}
        />
      ) : (
        <ScrapeFailureDetails scrape={scrape} />
      )}
    </article>
  );
}
