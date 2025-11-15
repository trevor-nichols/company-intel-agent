// ------------------------------------------------------------------------------------------------
//                SelectionRow.tsx - Individual selectable URL item for company intel runs
// ------------------------------------------------------------------------------------------------

import React, { useId, useMemo, type ReactElement } from 'react';
import { Button } from '@company-intel/ui/button';
import { Checkbox } from '@company-intel/ui/checkbox';
import { Badge } from '@company-intel/ui/badge';

export type SelectionRowType = 'recommended' | 'manual';

interface SelectionRowProps {
  readonly url: string;
  readonly type: SelectionRowType;
  readonly checked: boolean;
  readonly disabled: boolean;
  readonly signals?: readonly string[];
  readonly onToggle: (checked: boolean) => void;
  readonly onRemove?: () => void;
}

export function SelectionRow({
  url,
  type,
  checked,
  disabled,
  signals,
  onToggle,
  onRemove,
}: SelectionRowProps): ReactElement {
  const checkboxId = useId();
  const { hostname, pathname } = useMemo(() => {
    try {
      const parsed = new URL(url);
      return {
        hostname: parsed.hostname,
        pathname: parsed.pathname.length > 0 ? parsed.pathname : '/',
      };
    } catch {
      return { hostname: null, pathname: url };
    }
  }, [url]);

  const displayPath = pathname && pathname !== '/' ? pathname : '/';
  const showHostname = Boolean(hostname);
  const primaryLabel = showHostname ? displayPath : url;

  const selectionAriaLabel = signals?.length ? `${url}. Signals: ${signals.join(', ')}` : url;

  return (
    <div className="rounded-lg border border-border/30 bg-background/80 px-3 py-2 transition hover:border-border/50">
      <div className="flex items-center gap-3">
        <Checkbox
          id={checkboxId}
          checked={checked}
          onCheckedChange={value => onToggle(Boolean(value))}
          disabled={disabled}
          aria-label={`Toggle ${selectionAriaLabel}`}
        />

        <label htmlFor={checkboxId} className="flex min-w-0 flex-1 cursor-pointer flex-col" title={url}>
          <span className="truncate text-sm font-medium text-foreground">{primaryLabel}</span>
          {showHostname ? (
            <span className="truncate text-xs text-muted-foreground">{hostname}</span>
          ) : null}
        </label>

        {type === 'manual' ? (
          <div className="flex shrink-0 items-center gap-2">
            <Badge variant="outline" className="rounded-full px-2 text-xs">
              Manual
            </Badge>
            {onRemove ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-auto px-2 py-1 text-xs text-muted-foreground transition hover:text-destructive"
                onClick={event => {
                  event.preventDefault();
                  event.stopPropagation();
                  onRemove();
                }}
              >
                Remove
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
