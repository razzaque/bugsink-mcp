import { afterEach, describe, expect, it, vi } from 'vitest';

import { BugsinkClient } from '../src/bugsink-client.js';

/**
 * `order` must default to 'desc', as the tool schema documents (agent-marketing#2449).
 *
 * Omitting it let Bugsink apply its own default — ascending — so an un-ordered call
 * returned the OLDEST page. With the MAX_PAGES cap, that made an actively ingesting
 * instance look dead for eleven weeks. These tests record the URL the client actually
 * requests rather than trusting the parameter handling by reading it.
 */
function stubFetch() {
  const calls: string[] = [];
  const fetchMock = vi.fn(async (url: string) => {
    calls.push(url);
    return new Response(JSON.stringify({ count: 0, next: null, previous: null, results: [] }), {
      status: 200,
    });
  });
  vi.stubGlobal('fetch', fetchMock);
  return calls;
}

const client = () => new BugsinkClient({ baseUrl: 'https://bugsink.example.com', apiToken: 't' });

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('listIssues order', () => {
  it('sends order=desc when the caller omits it', async () => {
    const calls = stubFetch();
    await client().listIssues(1);
    expect(new URL(calls[0]).searchParams.get('order')).toBe('desc');
  });

  it('sends order=desc alongside sort=last_seen when only sort is given', async () => {
    // The exact call that produced the false alarm: a sort without an order.
    const calls = stubFetch();
    await client().listIssues(1, { sort: 'last_seen' });
    const params = new URL(calls[0]).searchParams;
    expect(params.get('sort')).toBe('last_seen');
    expect(params.get('order')).toBe('desc');
  });

  it('still honours an explicit ascending order', async () => {
    // The default must not override a caller who asks for oldest-first on purpose.
    const calls = stubFetch();
    await client().listIssues(1, { order: 'asc' });
    expect(new URL(calls[0]).searchParams.get('order')).toBe('asc');
  });
});
