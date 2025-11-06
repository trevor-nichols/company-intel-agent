// ------------------------------------------------------------------------------------------------
//                tooltip.tsx - Tooltip component shim
// ------------------------------------------------------------------------------------------------

import * as React from 'react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { cn } from '@/lib/utils/cn';

export const TooltipProvider = TooltipPrimitive.Provider;
export const Tooltip = TooltipPrimitive.Root;
export const TooltipTrigger = TooltipPrimitive.Trigger;

export const TooltipContent = React.forwardRef<React.ElementRef<typeof TooltipPrimitive.Content>, React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>>(
  ({ className, sideOffset = 8, ...props }, ref) => (
    <TooltipPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn('z-50 overflow-hidden rounded-md border border-border/60 bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-md animate-in fade-in zoom-in', className)}
      {...props}
    />
  ),
);

TooltipContent.displayName = TooltipPrimitive.Content.displayName;
