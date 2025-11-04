// ------------------------------------------------------------------------------------------------
//                SummaryMetadataPanel.tsx - Presents AI agent metadata alongside summaries
// ------------------------------------------------------------------------------------------------

import type { ReactElement } from 'react';
import { AlertCircle } from 'lucide-react';
import { Badge } from '@agenai/ui/badge';
import type { CompanyIntelSnapshotSummaries } from '../../../types';
import { MetadataBlock } from './SummariesSection/MetadataBlock';

interface SummaryMetadataPanelProps {
  readonly metadata: CompanyIntelSnapshotSummaries['metadata'] | null;
}

export function SummaryMetadataPanel({ metadata }: SummaryMetadataPanelProps): ReactElement {
  const hasStructuredMetadata = Boolean(metadata?.structuredProfile);
  const hasOverviewMetadata = Boolean(metadata?.overview);
  const hasContent = hasStructuredMetadata || hasOverviewMetadata;

  if (!hasContent) {
    return (
      <section className="rounded-2xl border border-dashed border-border/50 bg-muted/5 p-6 text-sm text-muted-foreground">
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-1 h-5 w-5 text-muted-foreground" aria-hidden />
          <div className="space-y-1">
            <p className="font-medium text-foreground">No agent metadata captured</p>
            <p className="text-xs text-muted-foreground">
              This snapshot predates enriched telemetry or the agent did not return additional attribution data.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-4 rounded-2xl border border-border/60 bg-muted/10 p-6 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-foreground">Agent metadata</p>
          <p className="text-xs text-muted-foreground">Raw telemetry from the writer agents for audit and debugging.</p>
        </div>
        <Badge variant="outline" className="text-xs">
          Telemetry
        </Badge>
      </div>

      <div className="space-y-3 text-xs text-muted-foreground">
        {hasStructuredMetadata ? (
          <MetadataBlock title="Structured output" metadata={metadata!.structuredProfile!} />
        ) : null}
        {hasOverviewMetadata ? (
          <MetadataBlock title="Overview output" metadata={metadata!.overview!} />
        ) : null}
      </div>
    </section>
  );
}
