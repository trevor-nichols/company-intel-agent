// ------------------------------------------------------------------------------------------------
//                skeleton.tsx - Skeleton placeholder component
// ------------------------------------------------------------------------------------------------

import * as React from 'react';
import { cn } from '@/lib/utils/cn';

export const Skeleton = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>): React.ReactElement => (
  <div
    className={cn('animate-pulse rounded-md bg-muted/60', className)}
    {...props}
  />
);
