// ------------------------------------------------------------------------------------------------
//                cn.ts - Utility helper for merging Tailwind class names - Dependencies: clsx, tailwind-merge
// ------------------------------------------------------------------------------------------------

import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
