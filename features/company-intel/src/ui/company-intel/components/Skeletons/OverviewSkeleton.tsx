// ------------------------------------------------------------------------------------------------
//                OverviewSkeleton.tsx - Loading placeholder for overview content
// ------------------------------------------------------------------------------------------------

import React, { type ReactElement } from 'react';
import { Skeleton } from '@company-intel/ui/skeleton';

export function OverviewSkeleton(): ReactElement {
  return (
    <div className="space-y-6">
      <Skeleton className="h-24 w-full rounded-xl" />
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-3">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
        <div className="space-y-3">
          <Skeleton className="h-3 w-36" />
          <div className="flex gap-2">
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-6 w-16" />
          </div>
          <div className="grid gap-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
      </div>
    </div>
  );
}

