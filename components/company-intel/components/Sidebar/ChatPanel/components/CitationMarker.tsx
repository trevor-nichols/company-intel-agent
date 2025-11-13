import React from 'react';

import { Tooltip, TooltipContent, TooltipTrigger } from '@agenai/ui/tooltip';

import type { CitationMarkerDescriptor } from '../utils/citations';

interface CitationMarkerProps {
  readonly marker: CitationMarkerDescriptor;
}

export function CitationMarker({ marker }: CitationMarkerProps): React.ReactElement {
  const label = marker.citation.filename ?? marker.citation.fileId;
  const snippet = marker.citation.quote ?? marker.citation.chunks?.[0]?.text ?? undefined;
  const score = typeof marker.citation.score === 'number' ? marker.citation.score : undefined;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          role="button"
          tabIndex={0}
          aria-label={`View source ${marker.ordinal}`}
          className="cursor-help px-0.5 text-sm font-semibold text-primary align-super"
        >
          {marker.superscript}
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" align="center" sideOffset={8} className="max-w-xs text-xs">
        <div className="space-y-1 text-left">
          <p className="font-medium text-foreground">{label}</p>
          {typeof score === 'number' ? <p className="text-muted-foreground">Score: {Math.round(score * 100) / 100}</p> : null}
          {snippet ? <p className="text-muted-foreground">“{snippet.trim()}”</p> : null}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
