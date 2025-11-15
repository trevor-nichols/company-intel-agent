export interface HttpResult<Body = unknown> {
  readonly status: number;
  readonly body?: Body;
  readonly headers?: Record<string, string>;
}

export interface ErrorPayload {
  readonly error: string;
}

export function success<Body>(body: Body, status = 200, headers?: Record<string, string>): HttpResult<Body> {
  return { status, body, headers };
}

export function error(message: string, status = 400): HttpResult<ErrorPayload> {
  return { status, body: { error: message } };
}
