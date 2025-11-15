import type { CompanyIntelEnvironment } from '../server/bootstrap';
import { PreviewCompanyIntelSchema } from '../server/handlers/schemas';
import type { CollectSiteIntelOptions } from '../server/web-search';
import { success, error, type HttpResult } from './http';

export async function handleCompanyIntelPreview(env: CompanyIntelEnvironment, body: unknown): Promise<HttpResult> {
  const parsed = PreviewCompanyIntelSchema.safeParse(body);
  if (!parsed.success) {
    return {
      status: 400,
      body: {
        error: 'Invalid preview payload',
        details: parsed.error.flatten(),
      },
    };
  }

  try {
    const domain = parsed.data.domain.trim();
    if (!domain) {
      return error('Domain is required', 400);
    }

    const options: CollectSiteIntelOptions | undefined = parsed.data.options && Object.keys(parsed.data.options).length > 0
      ? parsed.data.options
      : undefined;

    const preview = await env.server.preview(domain, options);
    return success({ data: preview });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unable to preview company intel';
    return error(message, 500);
  }
}
