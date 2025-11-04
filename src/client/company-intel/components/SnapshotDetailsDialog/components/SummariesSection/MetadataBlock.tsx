// ------------------------------------------------------------------------------------------------
//                MetadataBlock.tsx - Displays AI agent metadata details
// ------------------------------------------------------------------------------------------------

import type { ReactElement } from 'react';
import type { CompanyIntelSnapshotAgentMetadata } from '../../../../types';

interface MetadataBlockProps {
  readonly title: string;
  readonly metadata: CompanyIntelSnapshotAgentMetadata;
}

export function MetadataBlock({ title, metadata }: MetadataBlockProps): ReactElement {
  return (
    <div className="space-y-1 rounded-lg border border-border/40 bg-muted/10 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
      <dl className="grid gap-1 text-[11px] text-muted-foreground">
        {metadata.responseId ? (
          <div className="flex flex-wrap gap-1">
            <dt className="font-medium text-foreground">Response ID:</dt>
            <dd className="font-mono">{metadata.responseId}</dd>
          </div>
        ) : null}
        {metadata.model ? (
          <div className="flex flex-wrap gap-1">
            <dt className="font-medium text-foreground">Model:</dt>
            <dd>{metadata.model}</dd>
          </div>
        ) : null}
        {metadata.rawText ? (
          <div className="space-y-1">
            <dt className="font-medium text-foreground">Raw output</dt>
            <dd className="max-h-32 overflow-auto rounded bg-background/70 p-2 font-mono">
              {metadata.rawText}
            </dd>
          </div>
        ) : null}
        {metadata.usage ? (
          <div className="space-y-1">
            <dt className="font-medium text-foreground">Usage</dt>
            <dd className="max-h-40 overflow-auto rounded bg-background/70 p-2">
              <pre className="text-[10px] leading-relaxed text-muted-foreground">
                {JSON.stringify(metadata.usage, null, 2)}
              </pre>
            </dd>
          </div>
        ) : null}
      </dl>
    </div>
  );
}
