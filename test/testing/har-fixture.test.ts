import path from 'path';
import { HarFixture } from '../../lib/testing/har-fixture';
import { REDACTED } from '../../lib/testing/har/sanitizer';
import type { HttpRequestOptions } from '../../lib/requests/polarity-request';

const IPV4_HAR = path.join(__dirname, 'mocks', 'IPv4.har');
const DOMAIN_HAR = path.join(__dirname, 'mocks', 'domain.har');

const getOptions = (url: string, method = 'GET'): HttpRequestOptions =>
  ({ url, method }) as HttpRequestOptions;

describe('HarFixture.from', () => {
  it('loads a HAR file and matches an entry by url + method', async () => {
    const run = HarFixture.from(IPV4_HAR).asMock();
    const response = await run(
      getOptions('https://api.example.com/v1/ip/8.8.8.8?token=SECRET123')
    );

    expect(response).toBeDefined();
    expect(response?.statusCode).toBe(200);
    expect(response?.body).toEqual({
      ip: '8.8.8.8',
      org: 'Google LLC',
      country: 'US'
    });
  });

  it('returns the response in { body, statusCode, headers, request } shape', async () => {
    const run = HarFixture.from(IPV4_HAR).asMock();
    const response = await run(
      getOptions('https://api.example.com/v1/ip/8.8.8.8?token=SECRET123')
    );

    expect(response).toMatchObject({
      statusCode: 200,
      headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
      request: expect.objectContaining({
        method: 'GET',
        uri: 'https://api.example.com/v1/ip/8.8.8.8?token=SECRET123'
      })
    });
  });

  it('parses the body as a raw string when json is false', async () => {
    const run = HarFixture.from(IPV4_HAR).asMock();
    const response = await run({
      url: 'https://api.example.com/v1/ip/8.8.8.8?token=SECRET123',
      method: 'GET',
      json: false
    } as HttpRequestOptions);

    expect(typeof response?.body).toBe('string');
    expect(response?.body).toContain('Google LLC');
  });

  it('throws a descriptive error on a miss by default, naming the URL', async () => {
    const run = HarFixture.from(IPV4_HAR).asMock();
    await expect(
      run(getOptions('https://api.example.com/v1/ip/9.9.9.9'))
    ).rejects.toThrow('https://api.example.com/v1/ip/9.9.9.9');
  });

  it('returns undefined on a miss when onMiss is return-null', async () => {
    const run = HarFixture.from(IPV4_HAR, { onMiss: 'return-null' }).asMock();
    const response = await run(getOptions('https://api.example.com/v1/ip/9.9.9.9'));
    expect(response).toBeUndefined();
  });

  it('replays error (4xx) fixtures with the recorded status code', async () => {
    const run = HarFixture.from(IPV4_HAR).asMock();
    const response = await run(getOptions('https://api.example.com/v1/ip/1.1.1.1'));
    expect(response?.statusCode).toBe(404);
    expect(response?.body).toEqual({ error: 'not found' });
  });
});

describe('HarFixture sanitization at load', () => {
  it('redacts auth headers and secret query params from loaded entries', () => {
    const fixture = HarFixture.from(IPV4_HAR);
    const entry = fixture.getEntries().find((e) => e.request.url.includes('8.8.8.8'));

    expect(entry).toBeDefined();
    const authHeader = entry!.request.headers.find(
      (h) => h.name.toLowerCase() === 'authorization'
    );
    expect(authHeader?.value).toBe(REDACTED);

    const tokenQuery = entry!.request.queryString.find((q) => q.name === 'token');
    expect(tokenQuery?.value).toBe(REDACTED);
    expect(entry!.request.url).toContain(`token=${encodeURIComponent(REDACTED)}`);
  });

  it('keeps the response body intact (the useful fixture data)', () => {
    const fixture = HarFixture.from(IPV4_HAR);
    const entry = fixture.getEntries().find((e) => e.request.url.includes('8.8.8.8'));
    expect(entry!.response.content.text).toContain('Google LLC');
  });
});

describe('matchBy options', () => {
  it('matchBy "url" ignores the HTTP method', async () => {
    const run = HarFixture.from(IPV4_HAR, { matchBy: 'url' }).asMock();
    const response = await run(
      getOptions('https://api.example.com/v1/ip/8.8.8.8?token=SECRET123', 'POST')
    );
    expect(response?.statusCode).toBe(200);
  });

  it('matchBy "url-pattern" matches on origin + path prefix', async () => {
    const run = HarFixture.from(IPV4_HAR, { matchBy: 'url-pattern' }).asMock();
    // Recorded path is /v1/ip/8.8.8.8 — a deeper path under it should match.
    const response = await run(
      getOptions('https://api.example.com/v1/ip/8.8.8.8/extra?foo=bar')
    );
    expect(response?.statusCode).toBe(200);
  });

  it('ignoreQueryString matches regardless of query params', async () => {
    const run = HarFixture.from(IPV4_HAR, { ignoreQueryString: true }).asMock();
    const response = await run(
      getOptions('https://api.example.com/v1/ip/8.8.8.8?token=DIFFERENT&extra=1')
    );
    expect(response?.statusCode).toBe(200);
  });

  it('treats a redacted secret query param as a wildcard (token-in-URL APIs)', async () => {
    // The recorded token was stripped to [REDACTED] at load time. A request
    // carrying the real token must still match without ignoreQueryString.
    const run = HarFixture.from(IPV4_HAR, { onMiss: 'return-null' }).asMock();
    const response = await run(
      getOptions('https://api.example.com/v1/ip/8.8.8.8?token=DIFFERENT')
    );
    expect(response?.statusCode).toBe(200);
  });

  it('without ignoreQueryString, an extra non-secret query param is a miss', async () => {
    const run = HarFixture.from(IPV4_HAR, { onMiss: 'return-null' }).asMock();
    const response = await run(
      getOptions('https://api.example.com/v1/ip/8.8.8.8?token=SECRET123&page=2')
    );
    expect(response).toBeUndefined();
  });
});

describe('HarFixture.merge', () => {
  it('combines entries from multiple HAR files', async () => {
    const fixture = HarFixture.merge([
      HarFixture.from(IPV4_HAR),
      HarFixture.from(DOMAIN_HAR)
    ]);
    const run = fixture.asMock();

    const ipResponse = await run(
      getOptions('https://api.example.com/v1/ip/8.8.8.8?token=SECRET123')
    );
    expect(ipResponse?.statusCode).toBe(200);

    const domainResponse = await run(
      getOptions('https://api.example.com/v1/domain', 'POST')
    );
    expect(domainResponse?.body).toEqual({
      domain: 'example.com',
      reputation: 'good'
    });
  });

  it('resolves URL conflicts last-write-wins by recency', () => {
    const older = HarFixture.fromString(
      JSON.stringify({
        log: {
          version: '1.2',
          creator: { name: 't', version: '1' },
          entries: [
            makeEntry('https://api.example.com/x', 200, 'old', '2026-01-01T00:00:00.000Z')
          ]
        }
      })
    );
    const newer = HarFixture.fromString(
      JSON.stringify({
        log: {
          version: '1.2',
          creator: { name: 't', version: '1' },
          entries: [
            makeEntry('https://api.example.com/x', 200, 'new', '2026-02-01T00:00:00.000Z')
          ]
        }
      })
    );

    const merged = HarFixture.merge([older, newer]);
    expect(merged.getEntries()).toHaveLength(1);
    expect(merged.getEntries()[0].response.content.text).toContain('new');
  });
});

describe('asMock with a jest mock factory', () => {
  it('returns a spyable mock that records calls', async () => {
    const run = HarFixture.from(IPV4_HAR).asMock(jest.fn);
    await run(getOptions('https://api.example.com/v1/ip/8.8.8.8?token=SECRET123'));

    expect(run).toHaveBeenCalledTimes(1);
    expect(run).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'https://api.example.com/v1/ip/8.8.8.8?token=SECRET123'
      })
    );
  });
});

describe('asPolarityRequest', () => {
  it('returns a PolarityRequest constructor stub with a HAR-backed run', async () => {
    const moduleMock = HarFixture.from(IPV4_HAR).asPolarityRequest();
    const Ctor = moduleMock.PolarityRequest as new () => {
      run: (o: HttpRequestOptions) => Promise<unknown>;
      userOptions: unknown;
    };
    const instance = new Ctor();
    instance.userOptions = { apiKey: 'x' };

    const response = (await instance.run(
      getOptions('https://api.example.com/v1/ip/8.8.8.8?token=SECRET123')
    )) as { statusCode: number };
    expect(response.statusCode).toBe(200);
  });

  it('runInParallel maps entity through to the response', async () => {
    const moduleMock = HarFixture.from(IPV4_HAR).asPolarityRequest();
    const Ctor = moduleMock.PolarityRequest as new () => {
      runInParallel: (o: {
        allRequestOptions: HttpRequestOptions[];
      }) => Promise<Array<{ entity?: unknown } | undefined>>;
    };
    const instance = new Ctor();

    const results = await instance.runInParallel({
      allRequestOptions: [
        {
          url: 'https://api.example.com/v1/ip/8.8.8.8?token=SECRET123',
          method: 'GET',
          entity: { value: '8.8.8.8' }
        } as HttpRequestOptions
      ]
    });

    expect(results).toHaveLength(1);
    expect(results[0]?.entity).toEqual({ value: '8.8.8.8' });
  });
});

function makeEntry(url: string, status: number, marker: string, recordedAt: string) {
  return {
    startedDateTime: recordedAt,
    time: 1,
    request: {
      method: 'GET',
      url,
      httpVersion: 'HTTP/1.1',
      cookies: [],
      headers: [],
      queryString: [],
      headersSize: -1,
      bodySize: 0
    },
    response: {
      status,
      statusText: 'OK',
      httpVersion: 'HTTP/1.1',
      cookies: [],
      headers: [{ name: 'Content-Type', value: 'application/json' }],
      content: {
        size: 0,
        mimeType: 'application/json',
        text: `{"marker":"${marker}"}`
      },
      redirectURL: '',
      headersSize: -1,
      bodySize: 0
    },
    cache: {},
    timings: { send: 0, wait: 1, receive: 0 },
    _polarity: {
      kind: 'lookup' as const,
      type: 'IPv4',
      types: ['IP', 'IPv4'],
      primaryType: 'IP',
      entityValue: 'x',
      recordedAt
    }
  };
}
