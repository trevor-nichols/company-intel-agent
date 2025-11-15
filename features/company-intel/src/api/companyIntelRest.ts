import type { CompanyIntelEnvironment } from '../server/bootstrap';
import { serializeProfile, serializeSnapshot } from '../server/handlers/serialization';
import {
  TriggerCompanyIntelSchema,
  UpdateCompanyIntelProfileSchema,
} from '../server/handlers/schemas';
import type { CollectSiteIntelOptions } from '../server/web-search';
import { success, error, type HttpResult } from './http';
import {
  sanitizeKeyOfferings,
  sanitizeNullableString,
  sanitizeStringList,
} from './sanitize';

export async function handleCompanyIntelGet(env: CompanyIntelEnvironment, options: { limit?: number }): Promise<HttpResult> {
  try {
    const limit = options.limit ?? 10;
    const historyLimit = Math.min(Math.max(limit, 1), 25);

    const [profileRecord, snapshots] = await Promise.all([
      env.server.getProfile(),
      env.server.getSnapshotHistory(historyLimit),
    ]);

    return success({
      data: {
        profile: serializeProfile(profileRecord),
        snapshots: snapshots.map(serializeSnapshot),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unable to load company intel';
    return error(message, 500);
  }
}

export async function handleCompanyIntelPatch(env: CompanyIntelEnvironment, body: unknown): Promise<HttpResult> {
  const parsed = UpdateCompanyIntelProfileSchema.safeParse(body);
  if (!parsed.success) {
    return {
      status: 400,
      body: {
        error: 'Invalid profile update payload',
        details: parsed.error.flatten(),
      },
    };
  }

  try {
    const updates: Record<string, unknown> = {};
    const payload = parsed.data;

    if (Object.prototype.hasOwnProperty.call(payload, 'companyName')) {
      updates.companyName = sanitizeNullableString(payload.companyName);
    }

    if (Object.prototype.hasOwnProperty.call(payload, 'tagline')) {
      updates.tagline = sanitizeNullableString(payload.tagline);
    }

    if (Object.prototype.hasOwnProperty.call(payload, 'overview')) {
      updates.overview = sanitizeNullableString(payload.overview);
    }

    if (Object.prototype.hasOwnProperty.call(payload, 'primaryIndustries')) {
      updates.primaryIndustries = sanitizeStringList(payload.primaryIndustries ?? []);
    }

    if (Object.prototype.hasOwnProperty.call(payload, 'valueProps')) {
      updates.valueProps = sanitizeStringList(payload.valueProps ?? []);
    }

    if (Object.prototype.hasOwnProperty.call(payload, 'keyOfferings')) {
      updates.keyOfferings = sanitizeKeyOfferings(payload.keyOfferings ?? []);
    }

    const profile = await env.server.updateProfile({
      updates: updates as Parameters<typeof env.server.updateProfile>[0]['updates'],
    }, {});

    return success({ data: serializeProfile(profile) });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unable to update profile';
    return error(message, 500);
  }
}

export type TriggerValidationResult =
  | { ok: true; payload: { domain: string; options?: CollectSiteIntelOptions } }
  | { ok: false; response: HttpResult };

export function validateTriggerPayload(body: unknown): TriggerValidationResult {
  const parsed = TriggerCompanyIntelSchema.safeParse(body);
  if (!parsed.success) {
    return {
      ok: false,
      response: {
        status: 400,
        body: {
          error: 'Invalid trigger payload',
          details: parsed.error.flatten(),
        },
      },
    };
  }

  const domain = parsed.data.domain.trim();
  if (!domain) {
    return { ok: false, response: error('Domain is required', 400) };
  }

  const selectedUrls = sanitizeStringList(parsed.data.selectedUrls ?? []);
  const mergedOptions: CollectSiteIntelOptions = {
    ...(parsed.data.options ?? {}),
    ...(selectedUrls.length > 0 ? { selectedUrls } : {}),
  };

  const options = Object.keys(mergedOptions).length > 0 ? mergedOptions : undefined;

  return {
    ok: true,
    payload: {
      domain,
      ...(options ? { options } : {}),
    },
  };
}
