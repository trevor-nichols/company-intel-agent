// ------------------------------------------------------------------------------------------------
//                errors.ts - Shared HTTP error utilities for company intel client
// ------------------------------------------------------------------------------------------------

export class HttpError extends Error {
  readonly status: number;
  readonly body: unknown;

  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.body = body;
  }
}

export async function toHttpError(response: Response, fallbackMessage: string): Promise<HttpError> {
  const payload = await response
    .json()
    .catch(() => null);

  const message =
    typeof payload?.error === 'string'
      ? payload.error
      : response.statusText || fallbackMessage;

  return new HttpError(message, response.status, payload);
}
