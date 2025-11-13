import { describe, expect, it } from 'vitest';

import { POST } from '../company-intel/snapshots/[id]/chat/route';

describe('Company intel chat (non-streaming) route', () => {
  it('rejects requests that are not streaming', async () => {
    const response = await POST();
    expect(response.status).toBe(426);

    const payload = await response.json();
    expect(payload.error).toMatch(/stream/iu);
  });
});
