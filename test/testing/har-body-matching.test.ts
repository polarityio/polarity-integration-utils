import { HarFixture } from '../../lib/testing/har-fixture';
import { REDACTED } from '../../lib/testing/har/sanitizer';
import { detectCollisions, loadEntries, parseHar } from '../../lib/testing/har/loader';
import {
  normalizeBody,
  bodiesMatch,
  recordedBody,
  requestBody
} from '../../lib/testing/har/body';
import type { HarEntry } from '../../lib/testing/har/types';
import type { HttpRequestOptions } from '../../lib/requests/polarity-request';

/** Minimal HAR entry builder for POST/GET fixtures with a body + response. */
function makeEntry(opts: {
  method?: string;
  url: string;
  postData?: { mimeType: string; text: string };
  status?: number;
  responseText?: string;
  recordedAt?: string;
}): HarEntry {
  return {
    startedDateTime: opts.recordedAt ?? '2026-07-01T00:00:00.000Z',
    time: 1,
    request: {
      method: opts.method ?? 'POST',
      url: opts.url,
      httpVersion: 'HTTP/1.1',
      cookies: [],
      headers: opts.postData
        ? [{ name: 'content-type', value: opts.postData.mimeType }]
        : [],
      queryString: [],
      postData: opts.postData,
      headersSize: -1,
      bodySize: opts.postData ? opts.postData.text.length : 0
    },
    response: {
      status: opts.status ?? 200,
      statusText: 'OK',
      httpVersion: 'HTTP/1.1',
      cookies: [],
      headers: [{ name: 'Content-Type', value: 'application/json' }],
      content: {
        size: -1,
        mimeType: 'application/json',
        text: opts.responseText ?? '{"ok":true}'
      },
      redirectURL: '',
      headersSize: -1,
      bodySize: -1
    },
    cache: {},
    timings: { send: 0, wait: 1, receive: 0 },
    _polarity: {
      type: 'IPv4',
      types: ['IP', 'IPv4'],
      primaryType: 'IP',
      entityValue: '8.8.8.8',
      recordedAt: opts.recordedAt ?? '2026-07-01T00:00:00.000Z'
    }
  };
}

const harString = (entries: HarEntry[]): string =>
  JSON.stringify({
    log: { version: '1.2', creator: { name: 't', version: '1' }, entries }
  });

const json = (obj: unknown) => ({ mimeType: 'application/json', text: JSON.stringify(obj) });

describe('normalizeBody', () => {
  it('treats JSON as key-order independent', () => {
    const a = normalizeBody('{"a":1,"b":2}', 'application/json');
    const b = normalizeBody('{"b":2,"a":1}', 'application/json');
    expect(a.kind).toBe('json');
    expect(a.canonical).toBe(b.canonical);
  });

  it('treats form-urlencoded as pair-order independent', () => {
    const a = normalizeBody('b=2&a=1', 'application/x-www-form-urlencoded');
    const b = normalizeBody('a=1&b=2', 'application/x-www-form-urlencoded');
    expect(a.kind).toBe('form');
    expect(a.canonical).toBe(b.canonical);
  });

  it('infers JSON when the mime type is absent but the text parses', () => {
    expect(normalizeBody('{"x":1}', undefined).kind).toBe('json');
  });

  it('falls back to raw for unparseable / unlabeled text', () => {
    expect(normalizeBody('not json', 'text/plain').kind).toBe('raw');
    expect(normalizeBody('', undefined).kind).toBe('empty');
    expect(normalizeBody(undefined, undefined).kind).toBe('empty');
  });
});

describe('bodiesMatch', () => {
  it('matches equal JSON regardless of key order', () => {
    expect(
      bodiesMatch(normalizeBody('{"a":1,"b":2}', 'application/json'), requestBody({
        method: 'POST',
        body: { b: 2, a: 1 }
      } as unknown as HttpRequestOptions))
    ).toBe(true);
  });

  it('treats a redacted recorded JSON field as a wildcard', () => {
    const recorded = normalizeBody(
      JSON.stringify({ apikey: REDACTED, q: 'x' }),
      'application/json'
    );
    const requested = requestBody({
      method: 'POST',
      body: { apikey: 'real-secret', q: 'x' }
    } as unknown as HttpRequestOptions);
    expect(bodiesMatch(recorded, requested)).toBe(true);
  });

  it('does not match different JSON bodies', () => {
    const recorded = normalizeBody('{"q":"a"}', 'application/json');
    const requested = requestBody({
      method: 'POST',
      body: { q: 'b' }
    } as unknown as HttpRequestOptions);
    expect(bodiesMatch(recorded, requested)).toBe(false);
  });

  it('matches form bodies built from options.form', () => {
    const recorded = normalizeBody('b=2&a=1', 'application/x-www-form-urlencoded');
    const requested = requestBody({
      method: 'POST',
      form: { a: '1', b: '2' }
    } as unknown as HttpRequestOptions);
    expect(bodiesMatch(recorded, requested)).toBe(true);
  });

  it('empty matches only empty', () => {
    const empty = normalizeBody('', undefined);
    const jsonBody = normalizeBody('{"a":1}', 'application/json');
    expect(bodiesMatch(empty, empty)).toBe(true);
    expect(bodiesMatch(jsonBody, empty)).toBe(false);
  });
});

describe('recordedBody', () => {
  it('reconstructs urlencoded text from postData.params', () => {
    const entry = makeEntry({ url: 'https://api.example.com/s', postData: undefined });
    entry.request.postData = {
      mimeType: 'application/x-www-form-urlencoded',
      text: '',
      params: [
        { name: 'b', value: '2' },
        { name: 'a', value: '1' }
      ]
    };
    const normalized = recordedBody(entry);
    expect(normalized.kind).toBe('form');
    expect(normalized.canonical).toBe('a=1&b=2');
  });
});

describe('body-aware dedupe + matching', () => {
  const URL = 'https://api.example.com/v3/search';
  const entries = [
    makeEntry({
      url: URL,
      postData: json({ query: 'alpha' }),
      responseText: '{"hit":"alpha"}',
      recordedAt: '2026-07-01T00:00:00.000Z'
    }),
    makeEntry({
      url: URL,
      postData: json({ query: 'beta' }),
      responseText: '{"hit":"beta"}',
      recordedAt: '2026-07-02T00:00:00.000Z'
    })
  ];

  it('retains distinct-body entries to the same URL (no silent collapse)', () => {
    const fixture = HarFixture.fromString(harString(entries), {
      matchBy: 'url+method+body'
    });
    expect(fixture.getEntries()).toHaveLength(2);
  });

  it('resolves each POST body to its own recorded response', async () => {
    const run = HarFixture.fromString(harString(entries), {
      matchBy: 'url+method+body'
    }).asMock();

    const alpha = await run({
      url: URL,
      method: 'POST',
      body: { query: 'alpha' }
    } as unknown as HttpRequestOptions);
    const beta = await run({
      url: URL,
      method: 'POST',
      body: { query: 'beta' }
    } as unknown as HttpRequestOptions);

    expect(alpha?.body).toEqual({ hit: 'alpha' });
    expect(beta?.body).toEqual({ hit: 'beta' });
  });

  it('misses when no recorded body matches, under url+method+body', async () => {
    const run = HarFixture.fromString(harString(entries), {
      matchBy: 'url+method+body',
      onMiss: 'return-null'
    }).asMock();
    const miss = await run({
      url: URL,
      method: 'POST',
      body: { query: 'gamma' }
    } as unknown as HttpRequestOptions);
    expect(miss).toBeUndefined();
  });
});

describe('detectCollisions', () => {
  it('flags same-signature entries with conflicting responses', () => {
    const url = 'https://api.example.com/v3/search';
    const conflicting = [
      makeEntry({ url, postData: json({ q: 'x' }), responseText: '{"v":1}' }),
      makeEntry({ url, postData: json({ q: 'x' }), responseText: '{"v":2}' })
    ];
    const collisions = detectCollisions(conflicting);
    expect(collisions).toHaveLength(1);
    expect(collisions[0]).toMatchObject({ count: 2, distinctResponses: 2 });
    expect(collisions[0].signature).toContain(url);
  });

  it('does not flag distinct-body entries as a collision', () => {
    const url = 'https://api.example.com/v3/search';
    const distinct = [
      makeEntry({ url, postData: json({ q: 'x' }), responseText: '{"v":1}' }),
      makeEntry({ url, postData: json({ q: 'y' }), responseText: '{"v":2}' })
    ];
    expect(detectCollisions(distinct)).toHaveLength(0);
  });

  it('loadEntries invokes onCollision for conflicting signatures', () => {
    const url = 'https://api.example.com/v3/search';
    const conflicting = [
      makeEntry({ url, postData: json({ q: 'x' }), responseText: '{"v":1}' }),
      makeEntry({ url, postData: json({ q: 'x' }), responseText: '{"v":2}' })
    ];
    const onCollision = jest.fn();
    const har = parseHar(harString(conflicting));
    const deduped = loadEntries([har], { onCollision });
    expect(onCollision).toHaveBeenCalledTimes(1);
    // Recency wins: the later-recorded entry survives dedupe.
    expect(deduped).toHaveLength(1);
  });
});
