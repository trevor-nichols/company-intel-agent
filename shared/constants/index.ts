// ------------------------------------------------------------------------------------------------
//                index.ts - Shared constants for company intel feature - Dependencies: none
// ------------------------------------------------------------------------------------------------

export const COMPANY_INTEL_PUBLIC_ALLOWLIST: readonly string[] = (process.env.COMPANY_INTEL_PUBLIC_ALLOWLIST
  ? process.env.COMPANY_INTEL_PUBLIC_ALLOWLIST.split(',').map(value => value.trim()).filter(Boolean)
  : []);

export const COMPANY_INTEL_PUBLIC_RATE_LIMIT = {
  windowMs: 60 * 1000,
  maxRequests: 5,
} as const;
