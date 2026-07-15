/**
 * Request-body normalization for HAR matching and recency dedupe.
 *
 * The matcher and the loader both need a stable, content-type-aware view of a
 * request body so that (a) two requests to the same URL+method with different
 * bodies are distinguished, and (b) semantically-equal bodies (e.g. JSON with
 * reordered keys) compare equal. Without this, `dedupeByRecency` would collapse
 * distinct-body entries under a `METHOD + URL` key and silently drop all but the
 * most recent — losing fixtures for POST-based vendor APIs.
 *
 * Recorded bodies come from a HAR entry's `postData`; outgoing bodies come from
 * an {@link HttpRequestOptions} `body`/`form` (honoring the `json` flag),
 * mirroring how `postman-request` would have serialized them.
 *
 * A recorded value equal to the sanitizer's {@link REDACTED} placeholder acts as
 * a wildcard for that field (consistent with query-string matching), so a secret
 * stripped from a fixture body still matches the live request.
 *
 * @packageDocumentation
 */

import type { HarEntry, HarNameValue } from './types';
import type { HttpRequestOptions } from '../../requests/polarity-request';
import { REDACTED } from './sanitizer';

/**
 * The classification of a normalized body. `empty` means no body was sent
 * (typical GET); it is omitted from match/dedupe keys.
 *
 * @internal
 */
export type NormalizedBodyKind = 'empty' | 'json' | 'form' | 'raw';

/**
 * A body reduced to a comparable, content-type-aware form.
 *
 * @internal
 */
export interface NormalizedBody {
  kind: NormalizedBodyKind;
  /** Canonical string form; the basis of the dedupe key and raw equality. */
  canonical: string;
  /**
   * Parsed structure for wildcard-aware comparison. For `json` this is the
   * key-sorted value; for `form` an ordered `[key, value]` pair list.
   */
  tree?: unknown;
}

const JSON_MIME = /json/i;
const FORM_MIME = /x-www-form-urlencoded/i;

/** Recursively sorts object keys so JSON compares independent of key order. */
function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortValue);
  if (value && typeof value === 'object') {
    const source = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(source).sort()) out[key] = sortValue(source[key]);
    return out;
  }
  return value;
}

function canonicalJson(value: unknown): string {
  return JSON.stringify(sortValue(value));
}

/** Parses a urlencoded string into sorted `[key, value]` pairs. */
function parseForm(text: string): Array<[string, string]> {
  const pairs: Array<[string, string]> = [];
  new URLSearchParams(text).forEach((v, k) => pairs.push([k, v]));
  pairs.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : a[1] < b[1] ? -1 : 1));
  return pairs;
}

function formCanonical(pairs: Array<[string, string]>): string {
  return pairs.map(([k, v]) => `${k}=${v}`).join('&');
}

/**
 * Normalizes a raw body string + mime type into a comparable {@link NormalizedBody}.
 *
 * Content-type drives the strategy: JSON is key-sorted, form-urlencoded is
 * pair-sorted, everything else is compared as an opaque raw string. When the
 * mime type is absent/ambiguous, a body that parses as JSON is treated as JSON.
 *
 * @internal
 */
export function normalizeBody(
  text: string | undefined | null,
  mimeType: string | undefined
): NormalizedBody {
  if (text == null || text === '') return { kind: 'empty', canonical: '' };

  const mime = mimeType ?? '';
  if (FORM_MIME.test(mime)) {
    const pairs = parseForm(text);
    return { kind: 'form', canonical: formCanonical(pairs), tree: pairs };
  }

  // JSON when the mime says so, or (mime absent/ambiguous) when it parses.
  if (JSON_MIME.test(mime) || mime === '') {
    try {
      const parsed = JSON.parse(text);
      return { kind: 'json', canonical: canonicalJson(parsed), tree: parsed };
    } catch {
      // Declared JSON but unparseable, or unlabeled non-JSON: fall through to raw.
    }
  }

  return { kind: 'raw', canonical: text };
}

/** Reads the `content-type` header value from a HAR name/value list. */
function contentTypeOf(headers: HarNameValue[] | undefined): string | undefined {
  return (headers ?? []).find((h) => h.name.toLowerCase() === 'content-type')?.value;
}

/**
 * Extracts and normalizes the request body recorded in a HAR entry's `postData`
 * (reconstructing urlencoded text from `params` when `text` is absent).
 *
 * @internal
 */
export function recordedBody(entry: HarEntry): NormalizedBody {
  const postData = entry.request.postData;
  if (!postData) return { kind: 'empty', canonical: '' };

  let text = postData.text;
  if ((text == null || text === '') && postData.params?.length) {
    const usp = new URLSearchParams();
    for (const p of postData.params) usp.append(p.name, p.value);
    text = usp.toString();
  }
  return normalizeBody(text, postData.mimeType || contentTypeOf(entry.request.headers));
}

/**
 * Extracts and normalizes the body an outgoing request would send, mirroring
 * `postman-request` serialization: `form` → urlencoded; `body` → JSON when
 * `json !== false` (the `PolarityRequest` default), else the raw value.
 *
 * @internal
 */
export function requestBody(options: HttpRequestOptions): NormalizedBody {
  if (options.form != null && typeof options.form === 'object') {
    const usp = new URLSearchParams();
    for (const [k, v] of Object.entries(options.form as Record<string, unknown>)) {
      usp.append(k, typeof v === 'string' ? v : String(v));
    }
    return normalizeBody(usp.toString(), 'application/x-www-form-urlencoded');
  }

  const body = options.body;
  if (body == null) return { kind: 'empty', canonical: '' };

  const json = options.json !== false;
  if (typeof body === 'string') {
    return normalizeBody(body, json ? 'application/json' : contentTypeOf(undefined));
  }
  return normalizeBody(JSON.stringify(body), json ? 'application/json' : undefined);
}

/** Structural JSON match; a recorded {@link REDACTED} value wildcards its slot. */
function jsonMatches(recorded: unknown, requested: unknown): boolean {
  if (recorded === REDACTED) return true;
  if (Array.isArray(recorded) && Array.isArray(requested)) {
    return (
      recorded.length === requested.length &&
      recorded.every((r, i) => jsonMatches(r, requested[i]))
    );
  }
  if (recorded && requested && typeof recorded === 'object' && typeof requested === 'object') {
    const rk = Object.keys(recorded as Record<string, unknown>).sort();
    const qk = Object.keys(requested as Record<string, unknown>).sort();
    if (rk.length !== qk.length || !rk.every((k, i) => k === qk[i])) return false;
    return rk.every((k) =>
      jsonMatches(
        (recorded as Record<string, unknown>)[k],
        (requested as Record<string, unknown>)[k]
      )
    );
  }
  return recorded === requested;
}

/** Form match; a recorded {@link REDACTED} value wildcards that key's slot. */
function formMatches(
  recorded: Array<[string, string]>,
  requested: Array<[string, string]>
): boolean {
  if (recorded.length !== requested.length) return false;
  const remaining = new Map<string, string[]>();
  for (const [k, v] of requested) {
    const list = remaining.get(k) ?? [];
    list.push(v);
    remaining.set(k, list);
  }
  for (const [key, value] of recorded) {
    const candidates = remaining.get(key);
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

/**
 * True when the recorded body matches the outgoing request body. Empty matches
 * only empty; differing content-type kinds fall back to canonical-string
 * equality. Redacted recorded values act as wildcards for their field.
 *
 * @internal
 */
export function bodiesMatch(recorded: NormalizedBody, requested: NormalizedBody): boolean {
  if (recorded.kind === 'empty' || requested.kind === 'empty') {
    return recorded.kind === requested.kind;
  }
  if (recorded.kind !== requested.kind) {
    return recorded.canonical === requested.canonical;
  }
  if (recorded.kind === 'json') return jsonMatches(recorded.tree, requested.tree);
  if (recorded.kind === 'form') {
    return formMatches(
      recorded.tree as Array<[string, string]>,
      requested.tree as Array<[string, string]>
    );
  }
  return recorded.canonical === requested.canonical;
}
