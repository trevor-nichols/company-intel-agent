import React, { useMemo } from 'react';
import type { Components } from 'react-markdown';

import { Markdown } from '@/components/ui/markdown';
import { TooltipProvider } from '@agenai/ui/tooltip';
import { ShimmeringText } from '@agenai/ui/shimmering-text';

import { ReasoningAccordion } from '../ReasoningAccordion';
import { ToolActivityIndicator } from '../ToolActivityIndicator';
import type { AssistantTranscriptMessage } from '../../types';
import { CitationMarker } from '../CitationMarker';
import {
  type CitationMarkerMap,
  prepareCitationRendering,
} from '../../utils/citations';

interface AssistantMessageProps {
  readonly message: AssistantTranscriptMessage;
}

export function AssistantMessage({ message }: AssistantMessageProps): React.ReactElement {
  const { content, markerMap } = useMemo(
    () => prepareCitationRendering(message.content, message.citations),
    [message.content, message.citations],
  );
  const markdownComponents = useMemo(() => buildCitationComponents(markerMap), [markerMap]);
  const summarySegments = useMemo(
    () =>
      Object.entries(message.reasoning.segments)
        .sort(([a], [b]) => Number(a) - Number(b))
        .map(([, text]) => text),
    [message.reasoning.segments],
  );

  const bubble = (
    <div className="max-w-full rounded-lg border bg-muted/60 px-3 py-2 text-foreground shadow-sm md:max-w-[85%]">
      {message.content ? (
        <TooltipProvider delayDuration={120} skipDelayDuration={0}>
          <Markdown content={content} className="text-sm" components={markdownComponents} />
        </TooltipProvider>
      ) : message.status === 'failed' ? (
        <span className="text-sm text-destructive">Response interrupted.</span>
      ) : (
        <ShimmeringText text="Generating answer…" className="text-sm" />
      )}
    </div>
  );

  return (
    <div className="flex flex-col items-start gap-3 text-left text-sm">
      {(summarySegments.length > 0 || message.reasoning.isStreaming) && (
        <ReasoningAccordion
          headline={message.reasoning.headline}
          summarySegments={summarySegments}
          isStreaming={message.reasoning.isStreaming}
        />
      )}
      {message.tool ? <ToolActivityIndicator tool={message.tool.tool} status={message.tool.status} /> : null}
      {bubble}
    </div>
  );
}

function buildCitationComponents(markerMap: CitationMarkerMap): Components | undefined {
  const hasMarkers = Object.keys(markerMap).length > 0;
  if (!hasMarkers) {
    return undefined;
  }

  const defaultAnchor = ({ children, href, ...rest }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="font-medium text-primary underline-offset-4 hover:underline"
      {...rest}
    >
      {children}
    </a>
  );

  return {
    a: props => {
      const { href } = props;
      if (href && markerMap[href]) {
        return <CitationMarker marker={markerMap[href]} />;
      }
      return defaultAnchor(props);
    },
  } satisfies Components;
}
