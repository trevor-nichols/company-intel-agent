// ------------------------------------------------------------------------------------------------
//                shimmering-text.tsx - Animated text placeholder component
// ------------------------------------------------------------------------------------------------

import * as React from 'react';
import { cn } from '../lib/cn';

export interface ShimmeringTextProps extends React.HTMLAttributes<HTMLSpanElement> {
  readonly shimmer?: boolean;
  readonly text?: string;
  readonly startOnView?: boolean;
}

export function ShimmeringText({
  className,
  shimmer = true,
  text,
  children,
  startOnView = true,
  ...props
}: ShimmeringTextProps): React.ReactElement {
  const content = text ?? children;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 font-medium text-muted-foreground',
        shimmer ? 'shimmering-text' : undefined,
        className,
      )}
      data-shimmer-start={startOnView ? 'intersection' : 'immediate'}
      {...props}
    >
      {content}
    </span>
  );
}
