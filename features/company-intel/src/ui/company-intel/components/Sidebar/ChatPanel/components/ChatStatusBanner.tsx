import React from 'react';
import { AlertTriangle } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '../../../../../primitives/alert';

interface ChatStatusBannerProps {
  readonly statusNotice: string | null;
  readonly isVectorFailed: boolean;
  readonly vectorStoreError: string | null;
}

export function ChatStatusBanner(props: ChatStatusBannerProps): React.ReactElement | null {
  const { statusNotice, isVectorFailed, vectorStoreError } = props;

  if (!statusNotice && !(isVectorFailed && vectorStoreError)) {
    return null;
  }

  return (
    <div className="space-y-3">
      {statusNotice ? (
        <div className="rounded-md border border-dashed bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
          {statusNotice}
        </div>
      ) : null}
      {isVectorFailed && vectorStoreError ? (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" aria-hidden />
          <AlertTitle>Knowledge base unavailable</AlertTitle>
          <AlertDescription>{vectorStoreError}</AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}
