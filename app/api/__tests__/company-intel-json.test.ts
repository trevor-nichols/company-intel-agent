import { describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';

import { POST } from '../company-intel/route';

describe('Company intel run route (stream enforcement)', () => {
  it('returns 406 when the Accept header does not request an event stream', async () => {
    const request = new NextRequest('http://localhost/api/company-intel', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ domain: 'example.com' }),
    });

    const response = await POST(request);
    expect(response.status).toBe(406);
    const payload = await response.json();
    expect(payload.error).toMatch(/streaming only/i);
  });
});
