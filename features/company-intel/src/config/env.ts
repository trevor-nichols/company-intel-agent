// ------------------------------------------------------------------------------------------------
//                env.ts - Environment helpers + configuration hooks for Company Intel
// ------------------------------------------------------------------------------------------------

export type EnvSource = Record<string, string | undefined> | ((key: string) => string | undefined);

type EnvReader = (key: string) => string | undefined;

const defaultReader = (): EnvReader => (key: string) => normalize(process?.env?.[key]);

let envReader: EnvReader = defaultReader();

function normalize(value: string | undefined | null): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function toReader(source: EnvSource): EnvReader {
  if (typeof source === 'function') {
    return (key: string) => normalize(source(key));
  }
  const snapshot = { ...source };
  return (key: string) => normalize(snapshot[key]);
}

export function configureCompanyIntelEnv(source?: EnvSource): void {
  if (!source) {
    envReader = defaultReader();
    return;
  }
  envReader = toReader(source);
}

export function createEnvReader(source: EnvSource): EnvReader {
  return toReader(source);
}

export function getEnvVar(key: string): string | undefined {
  return envReader(key);
}

export function requireEnvVar(key: string): string {
  const value = getEnvVar(key);
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}
