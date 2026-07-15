/**
 * Strips sensitive data from HAR entries.
 *
 * The SDK recorder already sanitizes entries at record time, but the
 * `HarFixture` replay path sanitizes again defensively when loading: fixtures
 * cross a container/build boundary and may have been hand-authored, so we never
 * trust that auth material was stripped upstream.
 *
 * Mirrors the field list from
 * `polarity-integration-utils/lib/requests/sanitize-request-options.ts` and the
 * SDK's `har/sanitizer.ts`.
 *
 * Scope:
 *   - Request/response headers: redact known auth headers + any header whose key
 *     contains "secret", "token", or "password" (case-insensitive). `set-cookie`
 *     is included so vendor session credentials never persist into fixtures.
 *   - Request URL query params: redact common secret query keys.
 *   - Entity/IOC values and response bodies are intentionally KEPT — they are
 *     the useful fixture data that makes replay/mocking possible.
 *
 * @packageDocumentation
 */

import type { HarEntry, HarNameValue } from './types';

/**
 * Replacement value written in place of redacted secrets.
 *
 * @public
 */
export const REDACTED = '[REDACTED]';

/**
 * Exact header keys to redact (case-insensitive). Applies to both request and
 * response headers.
 */
const REDACT_HEADER_KEYS = new Set([
  'authorization',
  'x-api-key',
  'x-auth-token',
  'cookie',
  'set-cookie'
]);

/** Substrings that, if present in a header key, trigger redaction. */
const REDACT_HEADER_SUBSTRINGS = ['secret', 'token', 'password'];

/** Query-string parameter keys to redact (case-insensitive). */
const REDACT_QUERY_KEYS = new Set([
  'api_key',
  'apikey',
  'token',
  'key',
  'password',
  'secret'
]);

function shouldRedactHeader(name: string): boolean {
  const lower = name.toLowerCase();
  if (REDACT_HEADER_KEYS.has(lower)) return true;
  return REDACT_HEADER_SUBSTRINGS.some((sub) => lower.includes(sub));
}

function shouldRedactQueryKey(name: string): boolean {
  return REDACT_QUERY_KEYS.has(name.toLowerCase());
}

function sanitizeHeaders(headers: HarNameValue[]): HarNameValue[] {
  return headers.map((h) =>
    shouldRedactHeader(h.name) ? { name: h.name, value: REDACTED } : h
  );
}

function sanitizeQueryString(query: HarNameValue[]): HarNameValue[] {
  return query.map((q) =>
    shouldRedactQueryKey(q.name) ? { name: q.name, value: REDACTED } : q
  );
}

/**
 * Redacts secret query params inside a raw URL string so the persisted `url`
 * field stays consistent with the structured `queryString` array.
 */
function sanitizeUrl(rawUrl: string): string {
  try {
    const url = new URL(rawUrl);
    let changed = false;
    for (const key of Array.from(url.searchParams.keys())) {
      if (shouldRedactQueryKey(key)) {
        url.searchParams.set(key, REDACTED);
        changed = true;
      }
    }
    return changed ? url.toString() : rawUrl;
  } catch {
    // Relative or malformed URL — leave it untouched.
    return rawUrl;
  }
}

/**
 * Returns a sanitized copy of a single HAR entry, redacting auth-bearing
 * headers, cookies, and secret query parameters.
 *
 * @param entry - The HAR entry to sanitize.
 * @returns A sanitized copy of the entry. The original is not mutated.
 *
 * @group Testing
 * @public
 */
export function sanitizeEntry(entry: HarEntry): HarEntry {
  const requestCookies = (entry.request.cookies ?? []).map((c) => ({
    name: c.name,
    value: REDACTED
  }));

  return {
    ...entry,
    request: {
      ...entry.request,
      url: sanitizeUrl(entry.request.url),
      headers: sanitizeHeaders(entry.request.headers ?? []),
      queryString: sanitizeQueryString(entry.request.queryString ?? []),
      cookies: requestCookies
    },
    response: {
      ...entry.response,
      headers: sanitizeHeaders(entry.response.headers ?? [])
    }
  };
}

/**
 * Returns sanitized copies of a list of HAR entries.
 *
 * @param entries - The HAR entries to sanitize.
 * @returns Sanitized copies of the entries. Originals are not mutated.
 *
 * @group Testing
 * @public
 */
export function sanitizeEntries(entries: HarEntry[]): HarEntry[] {
  return entries.map(sanitizeEntry);
}
