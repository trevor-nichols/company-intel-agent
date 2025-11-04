// ------------------------------------------------------------------------------------------------
//                StructuredProfileSummary.tsx - Renders structured profile summary data
// ------------------------------------------------------------------------------------------------

import type { ReactElement } from 'react';
import type {
  CompanyIntelAgentSource,
  CompanyIntelSnapshotStructuredProfileSummary,
  CompanyProfileKeyOffering,
} from '../../../../types';

interface StructuredProfileSummaryProps {
  readonly structuredProfile: CompanyIntelSnapshotStructuredProfileSummary;
}

export function StructuredProfileSummary({ structuredProfile }: StructuredProfileSummaryProps): ReactElement {
  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold text-foreground">Structured profile</h4>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1 text-sm text-muted-foreground">
          <p>
            <span className="font-medium text-foreground">Company:</span>{' '}
            {structuredProfile.companyName ?? '—'}
          </p>
          {structuredProfile.tagline ? (
            <p>
              <span className="font-medium text-foreground">Tagline:</span>{' '}
              {structuredProfile.tagline}
            </p>
          ) : null}
          {structuredProfile.primaryIndustries.length > 0 ? (
            <p>
              <span className="font-medium text-foreground">Industries:</span>{' '}
              {structuredProfile.primaryIndustries.join(', ')}
            </p>
          ) : null}
        </div>

        <div className="space-y-1 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">Value propositions</span>
          {structuredProfile.valueProps.length > 0 ? (
            <ul className="list-disc space-y-1 pl-4">
              {structuredProfile.valueProps.map((value: string, index: number) => (
                <li key={`${value}-${index}`}>{value}</li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-muted-foreground">None captured</p>
          )}
        </div>
      </div>

      {structuredProfile.keyOfferings.length > 0 ? (
        <div className="space-y-2 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">Key offerings</span>
          <div className="grid gap-2 md:grid-cols-2">
            {structuredProfile.keyOfferings.map((offering: CompanyProfileKeyOffering) => (
              <div key={offering.title} className="rounded border border-border/40 bg-muted/10 p-3">
                <p className="font-medium text-foreground">{offering.title}</p>
                {offering.description ? (
                  <p className="text-xs text-muted-foreground">{offering.description}</p>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {structuredProfile.sources.length > 0 ? (
        <div className="space-y-1 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Sources</span>
          <ul className="list-disc space-y-1 pl-4">
            {structuredProfile.sources.map((source: CompanyIntelAgentSource) => (
              <li key={`${source.page}-${source.url}`} className="break-words">
                <span className="font-medium text-foreground">{source.page}</span> – {source.url}
                {source.rationale ? ` · ${source.rationale}` : ''}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
