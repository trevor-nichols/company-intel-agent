// ------------------------------------------------------------------------------------------------
//                alert.tsx - Alert component shim (shadcn-inspired)
// ------------------------------------------------------------------------------------------------

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils/cn';

const alertVariants = cva(
  'relative w-full rounded-lg border border-border/70 bg-card px-4 py-3 text-sm text-foreground shadow-sm transition-colors [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-3 [&>svg]:h-4 [&>svg]:w-4 [&>svg]:text-muted-foreground [&:has(svg)]:pl-10',
  {
    variants: {
      variant: {
        default: 'bg-card text-foreground',
        destructive: 'border-destructive/80 text-destructive dark:border-destructive [&>svg]:text-destructive',
        success: 'border-emerald-500/70 text-emerald-600 dark:text-emerald-400 [&>svg]:text-emerald-500',
        warning: 'border-amber-500/70 text-amber-600 dark:text-amber-400 [&>svg]:text-amber-500',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

export interface AlertProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof alertVariants> {}

export const Alert = React.forwardRef<HTMLDivElement, AlertProps>(({ className, variant, ...props }, ref) => (
  <div
    role="alert"
    ref={ref}
    className={cn(alertVariants({ variant }), className)}
    {...props}
  />
));

Alert.displayName = 'Alert';

export const AlertTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h5 ref={ref} className={cn('mb-1 font-semibold leading-none tracking-tight', className)} {...props} />
  ),
);

AlertTitle.displayName = 'AlertTitle';

export const AlertDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('text-sm leading-relaxed text-muted-foreground', className)} {...props} />
  ),
);

AlertDescription.displayName = 'AlertDescription';
