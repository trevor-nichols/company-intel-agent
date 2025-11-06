// ------------------------------------------------------------------------------------------------
//                ManualEntryRow.tsx - Inline manual URL entry row within selection list
// ------------------------------------------------------------------------------------------------

import React, { useEffect, useRef, type ReactElement } from 'react';
import { Button } from '@agenai/ui/button';
import { Input } from '@agenai/ui/input';

interface ManualEntryRowProps {
  readonly manualUrl: string;
  readonly manualError: string | null;
  readonly isBusy: boolean;
  readonly onChange: (value: string) => void;
  readonly onSubmit: (event?: React.FormEvent<HTMLFormElement>) => void;
  readonly onCancel: () => void;
  readonly onBlur: () => void;
}

export function ManualEntryRow({
  manualUrl,
  manualError,
  isBusy,
  onChange,
  onSubmit,
  onCancel,
  onBlur,
}: ManualEntryRowProps): ReactElement {
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-lg border border-border/30 bg-background/80 px-3 py-2"
    >
      <div className="flex flex-col gap-2">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
          <Input
            ref={inputRef}
            value={manualUrl}
            onChange={event => onChange(event.target.value)}
            onBlur={onBlur}
            disabled={isBusy}
            placeholder="https://example.com/custom-page"
            className="flex-1"
          />
          <div className="flex gap-2 sm:w-auto">
            <Button type="submit" size="sm" disabled={isBusy}>
              Add page
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </div>
        {manualError ? <p className="text-xs text-destructive">{manualError}</p> : null}
      </div>
    </form>
  );
}

