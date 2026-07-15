/**
 * Matches a {@link HttpRequestOptions} against recorded HAR entries and
 * synthesizes a {@link HttpRequestResponse} in the exact
 * `body` / `statusCode` / `headers` / `request` shape that
 * `PolarityRequest.run()` returns.
 *
 * This is the pure replay engine reused by both:
 *   - {@link HarFixture} (the Tier-1 in-repo unit-test convenience), and
 *   - the external HAR mock proxy (INT-2191), via a thin adapter that maps an
 *     inbound proxied request onto a {@link HttpRequestOptions} shape.
 *
 * No `nock`, no sockets, no TLS — matching happens on the structured request
 * options object (method + URL + body), so a matched request reflects exactly
 * what the integration would have sent.
 *
 * @packageDocumentation
 */

import type { HarEntry } from './types';
import type {
  HttpRequestOptions,
  HttpRequestResponse
} from '../../requests/polarity-request';
import { isErrorStatus } from './loader';
import { REDACTED } from './sanitizer';
import { recordedBody, requestBody, bodiesMatch, type NormalizedBody } from './body';

/**
 * How HAR entries are matched against outgoing requests.
 *
 * - `'url+method'` — match on both the URL and HTTP method (default).
 * - `'url+method+body'` — additionally require the normalized request body to
 *   match. Necessary for POST-based vendor APIs where the body (not the URL)
 *   carries the query, so two POSTs to the same URL resolve to their respective
 *   fixtures. The external mock proxy (INT-2191) uses this mode.
 * - `'url'` — match on URL only, ignoring the method.
 * - `'url-pattern'` — treat the recorded URL's path as a prefix and match any
 *   request whose URL path starts with it (method still respected). Useful when
 *   the integration appends volatile path/query segments.
 *
 * @public
 */
export type HarMatchBy = 'url+method' | 'url+method+body' | 'url' | 'url-pattern';

/**
 * What to do when no recorded entry matches an outgoing request.
 *
 * - `'throw'` — throw a descriptive `Error` naming the unmatched request
 *   (default; mirrors the SDK replayer's hard-fail-on-miss semantics).
 * - `'return-null'` — resolve the request to `undefined` (no response).
 * - `'passthrough'` — signal the caller to fall through to the real network.
 *   In `HarFixture` mock mode this behaves like `'return-null'`; the mock proxy
 *   instead hard-fails on a miss (it must never reach a live vendor).
 *
 * @public
 */
export type HarOnMiss = 'throw' | 'return-null' | 'passthrough';

/**
 * Options controlling how a {@link HarFixture} matches and replays entries.
 *
 * @public
 */
export interface HarFixtureOptions {
  /**
   * How to match HAR entries to requests.
   *
   * @defaultValue 'url+method'
   */
  matchBy?: HarMatchBy;
  /**
   * What to do when no matching entry is found.
   *
   * @defaultValue 'throw'
   */
  onMiss?: HarOnMiss;
  /**
   * Strip query parameters from both the recorded entry and the outgoing
   * request before matching. Useful for token-in-URL APIs or volatile query
   * params (timestamps, nonces).
   *
   * @defaultValue false
   */
  ignoreQueryString?: boolean;
}

/**
 * The resolved options for a fixture, with all defaults applied.
 *
 * @internal
 */
export interface ResolvedHarFixtureOptions {
  matchBy: HarMatchBy;
  onMiss: HarOnMiss;
  ignoreQueryString: boolean;
}

/**
 * Applies {@link HarFixtureOptions} defaults.
 *
 * @param options - Partial options.
 * @returns Fully-resolved options.
 *
 * @internal
 */
export function resolveOptions(
  options: HarFixtureOptions = {}
): ResolvedHarFixtureOptions {
  return {
    matchBy: options.matchBy ?? 'url+method',
    onMiss: options.onMiss ?? 'throw',
    ignoreQueryString: options.ignoreQueryString ?? false
  };
}

/**
 * Sentinel returned by {@link matchEntry} / {@link replay} to mean "no fixture".
 *
 * @internal
 */
export const REPLAY_MISS = Symbol('polarity.har.replay-miss');

/**
 * A miss outcome, optionally carrying the descriptor of the unmatched request.
 *
 * @internal
 */
export interface ReplayMiss {
  miss: typeof REPLAY_MISS;
  description: string;
}

/**
 * Type guard: was a replay attempt a miss?
 *
 * @internal
 */
export function isReplayMiss(value: unknown): value is ReplayMiss {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as ReplayMiss).miss === REPLAY_MISS
  );
}

/** Reads the effective URL off a request options object (`url` or `uri`). */
function requestUrlOf(requestOptions: HttpRequestOptions): string {
  const url = requestOptions.url ?? (requestOptions.uri as string | undefined);
  return typeof url === 'string' ? url : '';
}

/** Reads the effective method (default GET, upper-cased). */
function requestMethodOf(requestOptions: HttpRequestOptions): string {
  return (requestOptions.method || 'GET').toUpperCase();
}

interface ParsedUrl {
  /** protocol + host + port + pathname, lower-cased host. */
  base: string;
  /** Ordered list of query params as [key, value] pairs. */
  query: Array<[string, string]>;
  /** True when the URL could be parsed by the URL constructor. */
  valid: boolean;
  /** The raw input, used as a fallback for unparseable URLs. */
  raw: string;
}

/** Splits a URL into a comparable base + query, normalizing host casing. */
function parseUrl(rawUrl: string): ParsedUrl {
  try {
    const url = new URL(rawUrl);
    const query: Array<[string, string]> = [];
    url.searchParams.forEach((value, name) => query.push([name, value]));
    // Stable order so recorded vs request query compare order-independently.
    query.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : a[1] < b[1] ? -1 : 1));
    const base = `${url.protocol.toLowerCase()}//${url.hostname.toLowerCase()}${
      url.port ? `:${url.port}` : ''
    }${url.pathname}`;
    return { base, query, valid: true, raw: rawUrl };
  } catch {
    return { base: rawUrl.trim(), query: [], valid: false, raw: rawUrl };
  }
}

/**
 * Compares the query of a recorded entry against an outgoing request.
 *
 * A recorded param whose value is the sanitizer's {@link REDACTED} placeholder
 * acts as a wildcard for that key: the request must contain the key, but any
 * value matches. This is essential for token-in-URL APIs — the fixture's secret
 * was stripped at record/load time, so we cannot (and must not) compare it
 * literally.
 */
function queryMatches(
  recorded: Array<[string, string]>,
  requested: Array<[string, string]>
): boolean {
  if (recorded.length !== requested.length) return false;
  const requestedMap = new Map<string, string[]>();
  for (const [k, v] of requested) {
    const list = requestedMap.get(k) ?? [];
    list.push(v);
    requestedMap.set(k, list);
  }
  for (const [key, value] of recorded) {
    const candidates = requestedMap.get(key);
    if (!candidates || candidates.length === 0) return false;
    if (value === REDACTED) {
      candidates.shift();
      continue;
    }
    const idx = candidates.indexOf(value);
    if (idx === -1) return false;
    candidates.splice(idx, 1);
  }
  return true;
}

/** Does a single entry match the request under the given options? */
function entryMatches(
  entry: HarEntry,
  reqUrl: string,
  reqMethod: string,
  reqBody: NormalizedBody,
  options: ResolvedHarFixtureOptions
): boolean {
  const entryMethod = (entry.request.method || 'GET').toUpperCase();
  if (options.matchBy !== 'url' && entryMethod !== reqMethod) {
    return false;
  }

  const recorded = parseUrl(entry.request.url);
  const requested = parseUrl(reqUrl);

  let urlOk: boolean;
  if (options.matchBy === 'url-pattern') {
    // recorded base is treated as a path prefix; query is ignored.
    urlOk =
      !recorded.valid || !requested.valid
        ? requested.base === recorded.base
        : requested.base.startsWith(recorded.base);
  } else if (recorded.base !== requested.base) {
    urlOk = false;
  } else if (options.ignoreQueryString) {
    // ignoreQueryString drops query comparison entirely (token-in-URL / volatile
    // params).
    urlOk = true;
  } else {
    // Compare query params, treating redacted recorded values as wildcards so
    // stripped secrets don't break matching.
    urlOk = queryMatches(recorded.query, requested.query);
  }

  if (!urlOk) return false;

  // url+method+body additionally requires the normalized bodies to match, so
  // POST-based APIs disambiguate on the payload the URL doesn't carry. A
  // redacted recorded body field acts as a wildcard.
  if (options.matchBy === 'url+method+body') {
    return bodiesMatch(recordedBody(entry), reqBody);
  }
  return true;
}

/**
 * Finds the matching HAR entry for a request, or returns {@link REPLAY_MISS}.
 *
 * When multiple entries match (e.g. `url-pattern` or `url`-only), the
 * most-recent success entry is preferred; if there are no success entries, the
 * most-recent error entry is returned so error fixtures can still be replayed.
 *
 * Entries are expected to already be recency-deduped by {@link loadEntries}, so
 * "most recent" here only matters when several distinct URLs collapse under a
 * loose `matchBy`.
 *
 * @param entries - Effective (deduped) HAR entries.
 * @param requestOptions - The outgoing request options.
 * @param options - Resolved matching options.
 * @returns The matching {@link HarEntry}, or {@link REPLAY_MISS}.
 *
 * @internal
 */
export function matchEntry(
  entries: HarEntry[],
  requestOptions: HttpRequestOptions,
  options: ResolvedHarFixtureOptions
): HarEntry | typeof REPLAY_MISS {
  const reqUrl = requestUrlOf(requestOptions);
  const reqMethod = requestMethodOf(requestOptions);
  const reqBody = requestBody(requestOptions);

  const matches = entries.filter((entry) =>
    entryMatches(entry, reqUrl, reqMethod, reqBody, options)
  );
  if (matches.length === 0) return REPLAY_MISS;
  if (matches.length === 1) return matches[0];

  const successes = matches.filter(
    (entry) => !isErrorStatus(entry.response?.status ?? 0)
  );
  const pool = successes.length > 0 ? successes : matches;
  return pool[pool.length - 1];
}

/**
 * Builds a "METHOD url" description used in miss errors.
 *
 * @internal
 */
export function describeRequest(requestOptions: HttpRequestOptions): string {
  return `${requestMethodOf(requestOptions)} ${requestUrlOf(requestOptions) || '<no url>'}`;
}

/**
 * Builds the response body for a matched entry, mirroring `postman-request`:
 *
 * - When `json` is `false`, the body is returned verbatim as a string (the
 *   caller explicitly opted out of parsing), matching a non-JSON request.
 * - When `json` is `true` (the `PolarityRequest` default), the recorded text is
 *   parsed as JSON; on a parse failure the raw string is returned.
 */
function responseBody(entry: HarEntry, json: boolean): unknown {
  const text = entry.response?.content?.text;
  if (text == null || text === '') return json ? undefined : '';
  if (!json) return text;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/** Reconstructs a header map from a HAR entry's response headers. */
function responseHeaders(entry: HarEntry): Record<string, string> {
  const headers: Record<string, string> = {};
  for (const h of entry.response?.headers ?? []) {
    // content-length is intentionally kept as recorded; consumers rarely assert
    // on it and dropping it can desync some clients. Last-write-wins on dupes.
    headers[h.name] = h.value;
  }
  return headers;
}

/**
 * Synthesizes the {@link HttpRequestResponse} `PolarityRequest.run()` would have
 * produced for a matched entry. The shape mirrors `postman-request` output so
 * existing integration assertions (`body`, `statusCode`, `headers`, `request`)
 * need no changes.
 *
 * @param entry - The matched HAR entry.
 * @param requestOptions - The outgoing request options (echoed onto `request`).
 * @returns A fully-formed {@link HttpRequestResponse}.
 *
 * @internal
 */
export function synthesizeResponse(
  entry: HarEntry,
  requestOptions: HttpRequestOptions
): HttpRequestResponse {
  const json = requestOptions.json !== false;
  const statusCode = entry.response?.status ?? 200;

  return {
    statusCode,
    body: responseBody(entry, json),
    headers: responseHeaders(entry),
    request: {
      uri: requestUrlOf(requestOptions),
      method: requestMethodOf(requestOptions),
      headers: (requestOptions.headers as unknown) ?? {}
    }
  };
}

/**
 * The result of a replay attempt: either a synthesized response, or a miss
 * outcome carrying the unmatched request description.
 *
 * @internal
 */
export type ReplayResult = HttpRequestResponse | ReplayMiss;

/**
 * Matches a request against entries and, on a hit, synthesizes the response.
 * On a miss, returns a {@link ReplayMiss} (the caller decides whether to throw,
 * return null, or pass through based on `onMiss`).
 *
 * @param entries - Effective (deduped) HAR entries.
 * @param requestOptions - The outgoing request options.
 * @param options - Resolved matching options.
 * @returns The synthesized response, or a {@link ReplayMiss}.
 *
 * @internal
 */
export function replay(
  entries: HarEntry[],
  requestOptions: HttpRequestOptions,
  options: ResolvedHarFixtureOptions
): ReplayResult {
  const entry = matchEntry(entries, requestOptions, options);
  if (entry === REPLAY_MISS) {
    return { miss: REPLAY_MISS, description: describeRequest(requestOptions) };
  }
  return synthesizeResponse(entry, requestOptions);
}
