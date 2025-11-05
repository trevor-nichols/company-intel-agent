import { NextRequest } from 'next/server';
import { logger } from '@agenai/logging';

import { errorResponse, jsonResponse } from '@/server/handlers';
import { getCompanyIntelEnvironment } from '@/server/bootstrap';
import { serializeProfile, serializeSnapshot } from '@/server/handlers/serialization';
import {
  TriggerCompanyIntelSchema,
  UpdateCompanyIntelProfileSchema,
} from '@/server/handlers/schemas';
import type { CollectSiteIntelOptions } from '@/server/web-search';

import type { CompanyProfileKeyOffering } from '@/components/company-intel/types';
import type { UpdateCompanyIntelProfileParams } from '@/server/services/profileUpdates';

const textEncoder = new TextEncoder();

export const runtime = 'nodejs';

function sanitizeNullableString(value: string | null | undefined): string | null {
  if (value === null) {
    return null;
  }
  if (value === undefined) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function sanitizeStringList(values: readonly string[] | undefined): string[] {
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

function sanitizeKeyOfferings(values: readonly CompanyProfileKeyOffering[] | undefined): CompanyProfileKeyOffering[] {
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

function hasOwn<T extends object>(value: T, key: keyof T): boolean {
  return Object.prototype.hasOwnProperty.call(value, key);
}

export async function GET(request: NextRequest) {
  try {
    const { server } = getCompanyIntelEnvironment();

    const limitParam = request.nextUrl.searchParams.get('limit');
    const parsedLimit = limitParam ? Number.parseInt(limitParam, 10) : NaN;
    const historyLimit = Number.isFinite(parsedLimit) ? Math.min(Math.max(parsedLimit, 1), 25) : 10;

    const [profileRecord, snapshots] = await Promise.all([
      server.getProfile(),
      server.getSnapshotHistory(historyLimit),
    ]);

    return jsonResponse({
      data: {
        profile: serializeProfile(profileRecord),
        snapshots: snapshots.map(serializeSnapshot),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to load company intel';
    return errorResponse(message, 500);
  }
}

export async function PATCH(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body) {
    return errorResponse('Invalid JSON payload', 400);
  }

  const parsed = UpdateCompanyIntelProfileSchema.safeParse(body);
  if (!parsed.success) {
    return jsonResponse(
      {
        error: 'Invalid profile update payload',
        details: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  try {
    const { server } = getCompanyIntelEnvironment();

    const updates: Record<string, unknown> = {};
    const payload = parsed.data;

    if (hasOwn(payload, 'companyName')) {
      updates.companyName = sanitizeNullableString(payload.companyName);
    }

    if (hasOwn(payload, 'tagline')) {
      updates.tagline = sanitizeNullableString(payload.tagline);
    }

    if (hasOwn(payload, 'overview')) {
      updates.overview = sanitizeNullableString(payload.overview);
    }

    if (hasOwn(payload, 'primaryIndustries')) {
      updates.primaryIndustries = sanitizeStringList(payload.primaryIndustries ?? []);
    }

    if (hasOwn(payload, 'valueProps')) {
      updates.valueProps = sanitizeStringList(payload.valueProps ?? []);
    }

    if (hasOwn(payload, 'keyOfferings')) {
      updates.keyOfferings = sanitizeKeyOfferings(payload.keyOfferings ?? []);
    }

    const profile = await server.updateProfile(
      {
        updates: updates as UpdateCompanyIntelProfileParams['updates'],
      },
      {},
    );

    return jsonResponse({ data: serializeProfile(profile) });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to update profile';
    return errorResponse(message, 500);
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body) {
    return errorResponse('Invalid JSON payload', 400);
  }

  const parsed = TriggerCompanyIntelSchema.safeParse(body);
  if (!parsed.success) {
    return jsonResponse(
      {
        error: 'Invalid trigger payload',
        details: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  const acceptHeader = request.headers.get('accept') ?? '';
  const wantsStream = acceptHeader.toLowerCase().includes('text/event-stream');

  try {
    const { server } = getCompanyIntelEnvironment();

    const { domain } = parsed.data;
    const domainTrimmed = domain.trim();
    if (!domainTrimmed) {
      return errorResponse('Domain is required', 400);
    }

    const selectedUrls = sanitizeStringList(parsed.data.selectedUrls ?? []);

    const mergedOptions: CollectSiteIntelOptions = {
      ...(parsed.data.options ?? {}),
      ...(selectedUrls.length > 0 ? { selectedUrls } : {}),
    };

    const options: CollectSiteIntelOptions | undefined = Object.keys(mergedOptions).length > 0 ? mergedOptions : undefined;

    const runParams = {
      domain: domainTrimmed,
      ...(options ? { options } : {}),
    };

    if (!wantsStream) {
      const result = await server.runCollection(runParams);

      return jsonResponse({ data: result });
    }

    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        const write = (payload: string) => controller.enqueue(textEncoder.encode(payload));
        const sendEvent = (event: unknown) => {
          try {
            write(`data: ${JSON.stringify(event)}\n\n`);
          } catch (error) {
            const eventType = typeof event === 'object' && event !== null && 'type' in event ? (event as { type?: string }).type : undefined;
            logger.error('company-intel:sse:write-error', {
              eventType: typeof eventType === 'string' ? eventType : 'unknown',
              error,
            });
          }
        };
        const sendDone = () => write('data: [DONE]\n\n');

        let lastSnapshotId: number | null = null;
        let lastDomain = domainTrimmed;
        let isClosed = false;

        const closeStream = () => {
          if (!isClosed) {
            isClosed = true;
            controller.close();
          }
        };

        const abortHandler = () => {
          sendEvent({
            type: 'run-error',
            snapshotId: lastSnapshotId ?? -1,
            domain: lastDomain,
            message: 'Stream aborted by client',
          });
          sendDone();
          closeStream();
        };

        request.signal.addEventListener('abort', abortHandler, { once: true });

        server
          .runCollection(
            runParams,
            {
              onEvent: event => {
                lastSnapshotId = event.snapshotId;
                if (event.domain) {
                  lastDomain = event.domain;
                }
                sendEvent(event);
              },
            },
          )
          .then(result => {
            sendEvent({
              type: 'run-complete',
              snapshotId: result.snapshotId,
              domain: lastDomain,
              result,
            });
            sendDone();
            closeStream();
            request.signal.removeEventListener('abort', abortHandler);
          })
          .catch(error => {
            const message = error instanceof Error ? error.message : 'Company intel run failed';
            sendEvent({
              type: 'run-error',
              snapshotId: lastSnapshotId ?? -1,
              domain: lastDomain,
              message,
            });
            sendDone();
            closeStream();
            request.signal.removeEventListener('abort', abortHandler);
          });
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to start company intel run';
    return errorResponse(message, 500);
  }
}
