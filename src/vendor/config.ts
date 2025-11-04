// ------------------------------------------------------------------------------------------------
//                config.ts - Environment variable helpers used across the starter
// ------------------------------------------------------------------------------------------------

export function getEnvVar(key: string): string | undefined {
  const value = process.env[key];
  if (!value) {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function requireEnvVar(key: string): string {
  const value = getEnvVar(key);
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

export function getNumberEnvVar(key: string): number | undefined {
  const value = getEnvVar(key);
  if (value === undefined) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function getBooleanEnvVar(key: string, fallback = false): boolean {
  const value = getEnvVar(key);
  if (value === undefined) {
    return fallback;
  }

  if (['1', 'true', 'yes', 'on'].includes(value.toLowerCase())) {
    return true;
  }
  if (['0', 'false', 'no', 'off'].includes(value.toLowerCase())) {
    return false;
  }
  return fallback;
}
