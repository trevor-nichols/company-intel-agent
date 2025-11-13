import React from 'react';

import { Button } from '@agenai/ui/button';
import { ChatInput } from '@agenai/ui/chat-input';

interface ChatComposerProps {
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly onSubmit: () => void;
  readonly placeholder: string;
  readonly disabled: boolean;
  readonly helperText: string;
  readonly canClear: boolean;
  readonly onClear?: () => void;
  readonly clearDisabled?: boolean;
  readonly canStop: boolean;
  readonly onStop?: () => void;
}

export function ChatComposer(props: ChatComposerProps): React.ReactElement {
  const {
    value,
    onChange,
    onSubmit,
    placeholder,
    disabled,
    helperText,
    canClear,
    onClear,
    clearDisabled = false,
    canStop,
    onStop,
  } = props;

  return (
    <div className="space-y-2">
      <ChatInput
        value={value}
        onChange={onChange}
        onSubmit={onSubmit}
        placeholder={placeholder}
        disabled={disabled}
        helperText={helperText}
      />
      {(canClear || canStop) && (
        <div className="flex items-center justify-end gap-2">
          {canClear ? (
            <Button type="button" variant="ghost" size="sm" onClick={onClear} disabled={clearDisabled}>
              Clear
            </Button>
          ) : null}
          {canStop ? (
            <Button type="button" variant="outline" size="sm" onClick={onStop}>
              Stop
            </Button>
          ) : null}
        </div>
      )}
    </div>
  );
}
