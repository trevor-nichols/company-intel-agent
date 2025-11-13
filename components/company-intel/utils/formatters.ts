// ------------------------------------------------------------------------------------------------
//                formatters.ts - Common formatting helpers for company intel UI
// ------------------------------------------------------------------------------------------------

import type { CompanyProfileSnapshotStatus, CompanyProfileStatus } from '../types';

export type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline';

export function formatDate(value: Date | null | undefined): string {
  if (!value) {
    return '—';
  }

  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(value);
}

export function getStatusVariant(
  status: CompanyProfileStatus | CompanyProfileSnapshotStatus | 'not_configured',
): BadgeVariant {
  switch (status) {
    case 'ready':
    case 'complete':
      return 'default';
    case 'failed':
      return 'destructive';
    case 'refreshing':
    case 'running':
      return 'secondary';
    case 'cancelled':
      return 'outline';
    default:
      return 'outline';
  }
}

export function formatStatusLabel(
  status: CompanyProfileStatus | CompanyProfileSnapshotStatus | 'not_configured',
): string {
  return status
    .split('_')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function deriveInitials(value?: string | null): string {
  if (!value) {
    return 'CI';
  }

  const sanitized = value.replace(/https?:\/\//gi, '').trim();
  if (!sanitized) {
    return 'CI';
  }

  const segments = sanitized
    .split(/[\s./_-]+/)
    .filter(Boolean)
    .slice(0, 2);

  if (segments.length === 0) {
    return 'CI';
  }

  const initials = segments
    .map(segment => segment.charAt(0)?.toUpperCase() ?? '')
    .join('')
    .slice(0, 2);

  return initials.length > 0 ? initials : 'CI';
}
