import React from 'react';

import { ChatInput } from '@agenai/ui/chat-input';

interface ChatComposerProps {
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly onSubmit: () => void;
  readonly placeholder: string;
  readonly inputDisabled: boolean;
  readonly submitDisabled: boolean;
  readonly helperText: string;
  readonly isStreaming: boolean;
  readonly onStop?: () => void;
}

export function ChatComposer(props: ChatComposerProps): React.ReactElement {
  const {
    value,
    onChange,
    onSubmit,
    placeholder,
    inputDisabled,
    submitDisabled,
    helperText,
    isStreaming,
    onStop,
  } = props;

  return (
    <ChatInput
      value={value}
      onChange={onChange}
      onSubmit={onSubmit}
      placeholder={placeholder}
      inputDisabled={inputDisabled}
      submitDisabled={submitDisabled}
      helperText={helperText}
      isStreaming={isStreaming}
      onStop={onStop}
    />
  );
}
