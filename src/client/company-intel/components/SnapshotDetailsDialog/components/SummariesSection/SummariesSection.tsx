// ------------------------------------------------------------------------------------------------
//                SummariesSection.tsx - Aggregates AI generated summaries for snapshot dialog
// ------------------------------------------------------------------------------------------------

import type { ReactElement } from 'react';
import { Badge } from '@agenai/ui/badge';
import { Separator } from '@agenai/ui/separator';
import { MinimalMarkdown, ShimmeringText } from '@agenai/ui';
import type {
  CompanyIntelSnapshotStructuredProfileSummary,
  CompanyIntelSnapshotSummaries,
} from '../../../../types';
import { StructuredProfileSummary } from './StructuredProfileSummary';

interface SummariesSectionProps {
  readonly overview: string | null;
  readonly structuredProfile: CompanyIntelSnapshotStructuredProfileSummary | null;
  readonly metadata: CompanyIntelSnapshotSummaries['metadata'] | null;
  readonly pagesXml: string | null;
  readonly overviewHeadline?: string | null;
  readonly structuredHeadline?: string | null;
}

export function SummariesSection({
  overview,
  structuredProfile,
  metadata,
  pagesXml,
  overviewHeadline,
  structuredHeadline,
}: SummariesSectionProps): ReactElement | null {
  if (!overview && !structuredProfile && !pagesXml) {
    return null;
  }

  const structuredModel = metadata?.structuredProfile?.model;
  const overviewModel = metadata?.overview?.model;

  return (
    <section className="space-y-6 rounded-2xl border border-border/60 bg-muted/10 p-6 shadow-sm">
      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        <span className="font-semibold uppercase tracking-wide text-foreground">AI summaries</span>
        {structuredModel ? <Badge variant="outline">Structured · {structuredModel}</Badge> : null}
        {overviewModel ? <Badge variant="outline">Overview · {overviewModel}</Badge> : null}
      </div>

      {overview ? (
        <div className="space-y-3">
          <div>
            <p className="text-sm font-semibold text-foreground">Executive overview</p>
            <p className="text-xs text-muted-foreground">High-level brief automatically generated for stakeholders.</p>
          </div>
          <div className="rounded-2xl border border-border/40 bg-background/80 p-4">
            {overviewHeadline ? (
              <div className="space-y-2">
                <ShimmeringText text={overviewHeadline} className="text-base font-semibold" startOnView={false} />
              </div>
            ) : null}
            <MinimalMarkdown content={overview} />
          </div>
        </div>
      ) : null}

      {overview && structuredProfile ? <Separator /> : null}

      {structuredProfile ? (
        <div className="space-y-3">
          {structuredHeadline ? (
            <div className="space-y-2">
              <ShimmeringText text={structuredHeadline} className="text-base font-semibold" startOnView={false} />
            </div>
          ) : null}
          <StructuredProfileSummary structuredProfile={structuredProfile} />
        </div>
      ) : null}

      {structuredProfile && pagesXml ? <Separator /> : null}

      {pagesXml ? (
        <div className="space-y-3">
          <div>
            <p className="text-sm font-semibold text-foreground">Serialized pages payload</p>
            <p className="text-xs text-muted-foreground">Raw selection manifest preserved for replaying the crawl.</p>
          </div>
          <pre className="max-h-52 overflow-auto rounded-xl border border-border/40 bg-background/70 p-4 text-[11px] leading-relaxed text-muted-foreground">
            {pagesXml}
          </pre>
        </div>
      ) : null}
    </section>
  );
}
