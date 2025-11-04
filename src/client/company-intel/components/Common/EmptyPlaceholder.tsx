// ------------------------------------------------------------------------------------------------
//                EmptyPlaceholder.tsx - Minimal empty state for company intel content blocks
// ------------------------------------------------------------------------------------------------

import type { ReactElement } from 'react';

interface EmptyPlaceholderProps {
  readonly message: string;
}

export function EmptyPlaceholder({ message }: EmptyPlaceholderProps): ReactElement {
  return (
    <div className="rounded-lg border border-dashed border-border/40 bg-muted/5 px-3 py-4 text-xs text-muted-foreground">
      {message}
    </div>
  );
}

