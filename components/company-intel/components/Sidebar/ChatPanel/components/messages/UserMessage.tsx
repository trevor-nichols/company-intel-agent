import React from 'react';

import type { UserTranscriptMessage } from '../../types';

interface UserMessageProps {
  readonly message: UserTranscriptMessage;
}

export function UserMessage({ message }: UserMessageProps): React.ReactElement {
  return (
    <div className="flex flex-col items-end gap-2 text-right text-sm">
      <div className="max-w-full rounded-lg border bg-primary px-3 py-2 text-primary-foreground shadow-sm md:max-w-[85%]">
        {message.content}
      </div>
    </div>
  );
}
