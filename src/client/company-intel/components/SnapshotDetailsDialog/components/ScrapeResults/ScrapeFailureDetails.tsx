// ------------------------------------------------------------------------------------------------
//                ScrapeFailureDetails.tsx - Displays failure diagnostics for a scrape
// ------------------------------------------------------------------------------------------------

import type { ReactElement } from 'react';
import type { CompanyIntelScrapeRecord } from '../../../../types';

interface ScrapeFailureDetailsProps {
  readonly scrape: CompanyIntelScrapeRecord;
}

export function ScrapeFailureDetails({ scrape }: ScrapeFailureDetailsProps): ReactElement {
  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground">
        Tavily could not extract this page. Please review the error details below.
      </p>
      {scrape.error ? (
        <pre className="rounded bg-muted/40 p-3 text-xs text-destructive">
          {`${scrape.error.name}: ${scrape.error.message}`}
        </pre>
      ) : null}
      {scrape.response?.failedResults?.length ? (
        <div className="space-y-1">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Failed Attempts
          </h4>
          <pre className="max-h-48 overflow-auto rounded bg-muted/40 p-3 text-xs text-muted-foreground">
            {JSON.stringify(scrape.response.failedResults, null, 2)}
          </pre>
        </div>
      ) : null}
    </div>
  );
}
