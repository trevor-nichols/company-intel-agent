// ------------------------------------------------------------------------------------------------
//                SectionTitle.tsx - Consistent heading treatment for company intel sections
// ------------------------------------------------------------------------------------------------

import React, { type ReactElement } from 'react';

interface SectionTitleProps {
  readonly title: string;
  readonly description?: string;
}

export function SectionTitle({ title, description }: SectionTitleProps): ReactElement {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-3">
        <span className="h-3 w-1 rounded-full bg-foreground/70 shadow-[0_0_12px_rgba(0,0,0,0.12)]" />
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.28em] text-foreground/80">
          {title}
        </h3>
      </div>
      {description ? <p className="pl-4 text-xs text-muted-foreground/80">{description}</p> : null}
    </div>
  );
}

