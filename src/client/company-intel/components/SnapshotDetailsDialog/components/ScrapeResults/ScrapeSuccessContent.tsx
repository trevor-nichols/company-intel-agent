// ------------------------------------------------------------------------------------------------
//                ScrapeSuccessContent.tsx - Renders successful scrape content
// ------------------------------------------------------------------------------------------------

import type { ReactElement } from 'react';
import { MinimalMarkdown } from '@agenai/ui';
import type { CompanyIntelScrapeResponseResult } from '../../../../types';

interface ScrapeSuccessContentProps {
  readonly content: string | null;
  readonly primaryDocument: CompanyIntelScrapeResponseResult | null;
  readonly hasImages: boolean;
  readonly imageCount: number;
}

export function ScrapeSuccessContent({
  content,
  primaryDocument,
  hasImages,
  imageCount,
}: ScrapeSuccessContentProps): ReactElement {
  return (
    <div className="space-y-3">
      {content ? (
        <div className="rounded-md border border-border/40 bg-background/70 p-3">
          <MinimalMarkdown content={content} />
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Tavily did not return textual content for this URL.</p>
      )}

      {hasImages ? (
        <div className="space-y-1">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Images ({imageCount})
          </h4>
          <div className="flex flex-wrap gap-2">
            {primaryDocument?.images?.map((imageUrl: string) => (
              <span key={imageUrl} className="truncate rounded bg-muted px-2 py-1 text-xs text-muted-foreground">
                {imageUrl}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {primaryDocument?.metadata ? (
        <div className="space-y-1">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Metadata
          </h4>
          <pre className="max-h-48 overflow-auto rounded bg-muted/40 p-3 text-xs text-muted-foreground">
            {JSON.stringify(primaryDocument.metadata, null, 2)}
          </pre>
        </div>
      ) : null}
    </div>
  );
}
