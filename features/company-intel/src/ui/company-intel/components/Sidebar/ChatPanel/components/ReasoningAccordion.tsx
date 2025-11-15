"use client";

// ------------------------------------------------------------------------------------------------
//                ReasoningAccordion - Collapsible reasoning summary viewer
// ------------------------------------------------------------------------------------------------

import React, { useId, useState } from 'react';
import { ChevronDown } from 'lucide-react';

import { Markdown } from '../../../../../primitives/markdown';
import { ShimmeringText } from '../../../../../primitives/shimmering-text';
import { cn } from '../../../../../lib/cn';

export interface ReasoningAccordionProps {
  readonly headline?: string | null;
  readonly summarySegments: readonly string[];
  readonly isStreaming?: boolean;
  readonly className?: string;
}

export function ReasoningAccordion({
  headline,
  summarySegments,
  isStreaming = false,
  className,
}: ReasoningAccordionProps): React.ReactElement | null {
  const [isOpen, setIsOpen] = useState(false);
  const contentId = useId();
  const hasSummary = summarySegments.length > 0;
  if (!hasSummary && !isStreaming) {
    return null;
  }

  const derivedHeadline = headline && headline.trim().length > 0
    ? headline.trim()
    : 'Reasoning in progress…';

  const summary = summarySegments.join('\n\n').trim();

  return (
    <div
      className={cn(
        'w-full rounded-md border border-muted bg-muted/40 text-sm text-muted-foreground',
        className,
      )}
    >
      <button
        type="button"
        aria-expanded={isOpen}
        aria-controls={contentId}
        className={cn(
          'flex w-full items-center justify-between gap-3 px-3 py-2 text-left font-medium transition-colors',
          'hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        )}
        onClick={() => setIsOpen(prev => !prev)}
      >
        <ShimmeringText
          shimmer={isStreaming && !headline}
          text={derivedHeadline}
          className={cn('text-sm font-semibold text-foreground', isStreaming && !headline && 'text-muted-foreground')}
        />
        <ChevronDown
          className={cn(
            'h-4 w-4 text-muted-foreground transition-transform duration-200',
            isOpen ? 'rotate-180' : 'rotate-0',
          )}
          aria-hidden="true"
        />
      </button>
      <div
        id={contentId}
        hidden={!isOpen}
        className="border-t border-muted px-3 py-2 text-foreground"
      >
        {summary ? (
          <Markdown content={summary} className="text-sm leading-relaxed" />
        ) : (
          <p className="italic text-muted-foreground">Waiting on the model’s reasoning summary…</p>
        )}
      </div>
    </div>
  );
}
