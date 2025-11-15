import type { CompanyProfileKeyOffering } from '../shared/types';

export function sanitizeNullableString(value: string | null | undefined): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function sanitizeStringList(values: readonly string[] | undefined): string[] {
  if (!values) {
    return [];
  }

  const seen = new Set<string>();
  const result: string[] = [];

  for (const candidate of values) {
    if (typeof candidate !== 'string') {
      continue;
    }
    const trimmed = candidate.trim();
    if (!trimmed) {
      continue;
    }
    const key = trimmed.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(trimmed);
  }

  return result;
}

export function sanitizeKeyOfferings(values: readonly CompanyProfileKeyOffering[] | undefined): CompanyProfileKeyOffering[] {
  if (!values) {
    return [];
  }

  const seen = new Set<string>();
  const result: CompanyProfileKeyOffering[] = [];

  for (const offering of values) {
    if (!offering || typeof offering.title !== 'string') {
      continue;
    }

    const title = offering.title.trim();
    if (!title) {
      continue;
    }

    const key = title.toLowerCase();
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    const description = typeof offering.description === 'string' ? offering.description.trim() : undefined;

    result.push({
      title,
      ...(description ? { description } : {}),
    });
  }

  return result;
}
