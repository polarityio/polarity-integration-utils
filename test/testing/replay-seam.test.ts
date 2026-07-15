import path from 'path';
import { identity } from 'lodash/fp';
import { setLogger } from '../../lib/logging/logger';
import { PolarityRequest } from '../../lib/requests/polarity-request';
import { isReplaySeamActive, clearReplaySeam } from '../../lib/requests/replay-seam';
import {
  registerHarReplayer,
  clearHarReplayer
} from '../../lib/testing/register-har-replayer';
import { HarFixture } from '../../lib/testing/har-fixture';
import postmanRequest from 'postman-request';
import type { DoLookupUserOptions } from '@polarityio/integration-types';

const IPV4_HAR = path.join(__dirname, 'mocks', 'IPv4.har');

const identityLogger = {
  child: () => identityLogger,
  trace: identity,
  info: identity,
  error: identity,
  debug: identity,
  fatal: identity,
  warn: identity
};

beforeAll(() => {
  setLogger(identityLogger);
});

// The seam should make run() resolve from fixtures WITHOUT touching the network.
// We mock postman-request so that any accidental live call would be detectable.
// `fs` is intentionally NOT mocked — HarFixture.from() must read the real HAR.
jest.mock('postman-request');

const userOptions = { apiKey: 'test' } as unknown as DoLookupUserOptions;

// postman-request ships no types, so `defaults` is `any` here (matching the
// existing polarity-request test). Helpers below install the live behavior we
// want the seam to bypass (or, for passthrough tests, to actually use).
function setLiveThrows(): void {
  postmanRequest.defaults.mockImplementation(() => () => {
    throw new Error('LIVE NETWORK CALL SHOULD NOT HAPPEN');
  });
}

function setLiveResponse(response: unknown): void {
  postmanRequest.defaults.mockImplementation(
    () => (_opts: unknown, cb: (e: unknown, r: unknown) => void) => {
      cb(null, response);
    }
  );
}

afterEach(() => {
  clearHarReplayer();
  clearReplaySeam();
  jest.clearAllMocks();
});

describe('replay seam (production inertness)', () => {
  it('is inert by default — no replayer registered', () => {
    expect(isReplaySeamActive()).toBe(false);
  });
});

describe('registerHarReplayer + PolarityRequest.run', () => {
  it('serves a matching request from fixtures without hitting the network', async () => {
    // Make any live postman-request call throw, proving replay short-circuits.
    setLiveThrows();

    const unregister = registerHarReplayer(HarFixture.from(IPV4_HAR));
    expect(isReplaySeamActive()).toBe(true);

    const request = new PolarityRequest();
    request.userOptions = userOptions;

    const response = await request.run({
      url: 'https://api.example.com/v1/ip/8.8.8.8?token=SECRET123',
      method: 'GET'
    });

    expect(response?.statusCode).toBe(200);
    expect(response?.body).toEqual({
      ip: '8.8.8.8',
      org: 'Google LLC',
      country: 'US'
    });

    unregister();
    expect(isReplaySeamActive()).toBe(false);
  });

  it('still runs afterResponse hooks on a replayed response', async () => {
    setLiveThrows();

    registerHarReplayer(HarFixture.from(IPV4_HAR));

    const request = new PolarityRequest({
      hooks: {
        afterResponse: [
          async (response) => {
            return { ...response, body: { transformed: true } };
          }
        ]
      }
    });
    request.userOptions = userOptions;

    const response = await request.run({
      url: 'https://api.example.com/v1/ip/8.8.8.8?token=SECRET123',
      method: 'GET'
    });

    expect(response?.body).toEqual({ transformed: true });
  });

  it('throws a legible replay-miss error when onMiss is throw (default)', async () => {
    setLiveThrows();

    registerHarReplayer(HarFixture.from(IPV4_HAR));

    const request = new PolarityRequest();
    request.userOptions = userOptions;

    await expect(
      request.run({ url: 'https://api.example.com/v1/ip/9.9.9.9', method: 'GET' })
    ).rejects.toThrow('https://api.example.com/v1/ip/9.9.9.9');
  });

  it('falls through to the live request on a miss when onMiss is passthrough', async () => {
    setLiveResponse({
      statusCode: 200,
      body: { live: true },
      headers: {},
      request: { uri: '', method: 'GET', headers: {} }
    });

    registerHarReplayer(HarFixture.from(IPV4_HAR), { onMiss: 'passthrough' });

    const request = new PolarityRequest();
    request.userOptions = userOptions;

    const response = await request.run({
      url: 'https://api.example.com/v1/ip/9.9.9.9',
      method: 'GET'
    });

    expect(response?.body).toEqual({ live: true });
  });

  it('detects API errors from replayed error fixtures', async () => {
    setLiveThrows();

    registerHarReplayer(HarFixture.from(IPV4_HAR));

    const request = new PolarityRequest();
    request.userOptions = userOptions;

    // The 1.1.1.1 fixture is a recorded 404 — detectApiError should throw.
    await expect(
      request.run({ url: 'https://api.example.com/v1/ip/1.1.1.1', method: 'GET' })
    ).rejects.toThrow();
  });

  it('unregister restores live behavior', async () => {
    setLiveResponse({
      statusCode: 200,
      body: { live: true },
      headers: {},
      request: { uri: '', method: 'GET', headers: {} }
    });

    const unregister = registerHarReplayer(HarFixture.from(IPV4_HAR));
    unregister();

    const request = new PolarityRequest();
    request.userOptions = userOptions;

    const response = await request.run({
      url: 'https://api.example.com/v1/ip/8.8.8.8?token=SECRET123',
      method: 'GET'
    });

    // With the seam cleared, the live (mocked) response is returned, not fixture.
    expect(response?.body).toEqual({ live: true });
  });
});
