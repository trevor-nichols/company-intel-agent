// ------------------------------------------------------------------------------------------------
//                label.tsx - Label component shim
// ------------------------------------------------------------------------------------------------

import * as React from 'react';
import { cn } from '../lib/cn';

interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  readonly requiredIndicator?: React.ReactNode;
}

export const Label = React.forwardRef<HTMLLabelElement, LabelProps>(({ className, requiredIndicator, children, ...props }, ref) => (
  <label
    ref={ref}
    className={cn('text-sm font-medium leading-none text-muted-foreground peer-disabled:cursor-not-allowed peer-disabled:opacity-70', className)}
    {...props}
  >
    {children}
    {requiredIndicator ? <span className="ml-1 text-destructive">{requiredIndicator}</span> : null}
  </label>
));

Label.displayName = 'Label';
