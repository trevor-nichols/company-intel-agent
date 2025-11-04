// ------------------------------------------------------------------------------------------------
//                ThinkingPlaceholder.tsx - Streaming placeholder with shimmering status text
// ------------------------------------------------------------------------------------------------

import type { ReactElement } from 'react';
import { ShimmeringText } from '@agenai/ui';

interface ThinkingPlaceholderProps {
  readonly fallbackText?: string;
  readonly text?: string | null;
  readonly className?: string;
}

const DEFAULT_TEXT = 'Thinking…';

export function ThinkingPlaceholder({
  fallbackText = DEFAULT_TEXT,
  text,
  className,
}: ThinkingPlaceholderProps): ReactElement {
  const content = text?.trim().length ? text.trim() : fallbackText;
  const containerClassName = [
    'rounded-lg border border-dashed border-border/40 bg-muted/5 px-3 py-4',
    className ?? '',
  ]
    .join(' ')
    .trim();

  return (
    <div className={containerClassName} aria-live="polite">
      <ShimmeringText text={content} className="text-xs font-medium text-muted-foreground" startOnView={false} />
    </div>
  );
}
