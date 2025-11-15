import { describe, expect, it } from 'vitest';

import { NextRequest } from 'next/server';

import { POST } from '../company-intel/snapshots/[id]/chat/route';

describe('Company intel chat route', () => {
  it('rejects requests missing the text/event-stream Accept header', async () => {
    const request = new NextRequest('http://localhost/api/company-intel/snapshots/42/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [] }),
    });

    const response = await POST(request, { params: { id: '42' } });

    expect(response.status).toBe(406);
    const payload = await response.json();
    expect(payload.error).toMatch(/text\/event-stream/iu);
  });
});
