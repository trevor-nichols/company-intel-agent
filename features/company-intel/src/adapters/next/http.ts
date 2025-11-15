import { NextResponse } from 'next/server';
import type { HttpResult } from '../../api/http';

function isBinaryBody(body: unknown): body is Uint8Array | ArrayBuffer {
  if (body instanceof Uint8Array || body instanceof ArrayBuffer) {
    return true;
  }
  // Buffer may not be recognised as Uint8Array across module boundaries
  if (typeof Buffer !== 'undefined' && Buffer.isBuffer(body)) {
    return true;
  }
  return false;
}

export function toNextResponse<Body>(result: HttpResult<Body>): NextResponse {
  const init: ResponseInit = {
    status: result.status,
    headers: result.headers ? new Headers(result.headers) : undefined,
  };

  if (isBinaryBody(result.body)) {
    return new NextResponse(result.body as BodyInit, init);
  }

  if (result.body === undefined) {
    return new NextResponse(null, init);
  }

  return NextResponse.json(result.body, init);
}

export function createSseResponse(stream: ReadableStream<Uint8Array>): Response {
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
