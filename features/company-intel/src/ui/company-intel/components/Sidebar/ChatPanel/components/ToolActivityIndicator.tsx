"use client";

// ------------------------------------------------------------------------------------------------
//                ToolActivityIndicator - Visual status for chat tool usage
// ------------------------------------------------------------------------------------------------

import React from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';

import { cn } from '../../../../../lib/cn';
import { Spinner } from '../../../../../primitives/spinner';
import type { CompanyIntelChatToolStatus } from '../../../../../../shared/chat';

const TOOL_LABELS: Record<string, string> = {
  file_search: 'File search',
};

const STATUS_LABELS: Record<CompanyIntelChatToolStatus, string> = {
  in_progress: 'Preparing context…',
  searching: 'Searching snapshot files…',
  completed: 'Tool complete',
  cancelled: 'Tool stopped',
};

export interface ToolActivityIndicatorProps {
  readonly tool: string;
  readonly status: CompanyIntelChatToolStatus;
  readonly className?: string;
}

export function ToolActivityIndicator({ tool, status, className }: ToolActivityIndicatorProps): React.ReactElement {
  const label = TOOL_LABELS[tool] ?? 'Tool';
  const statusLabel = STATUS_LABELS[status] ?? status;
  const isCancelled = status === 'cancelled';

  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-md border border-muted bg-muted/60 px-3 py-2 text-xs text-muted-foreground',
        className,
      )}
    >
      {status === 'completed' ? (
        <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
      ) : isCancelled ? (
        <XCircle className="h-4 w-4 text-destructive" aria-hidden="true" />
      ) : (
        <Spinner size="sm" className="text-muted-foreground" />
      )}
      <div className="flex flex-col">
        <span className="font-medium text-foreground">{label}</span>
        <span className="text-muted-foreground">{statusLabel}</span>
      </div>
    </div>
  );
}
