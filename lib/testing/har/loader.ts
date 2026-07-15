/**
 * Loads and normalizes HAR fixture files for replay.
 *
 * The SDK recorder writes append-only HAR files (multiple lookups of the same
 * type accumulate entries in one file), so the loader dedupes by recency: the
 * most-recent entry per `method + URL` wins. This mirrors the SDK replayer's
 * `dedupeByRecency` so utils-side replay and SDK-side `--replay-har` agree on
 * which entry is effective.
 *
 * This module is pure JSON + filesystem reads — no `nock`, no HTTP layer. The
 * matcher consumes the deduped entries to serve `HarFixture` (unit tests) and
 * the external HAR mock proxy (INT-2191).
 *
 * @packageDocumentation
 */

import fs from 'fs';
import { createHash } from 'crypto';
import type { Har, HarEntry } from './types';
import { sanitizeEntries } from './sanitizer';
import { recordedBody } from './body';

/**
 * Returns true when an HTTP status should be treated as an error fixture.
 * Per the INT-2019 convention, only 4xx/5xx are errors; 2xx and 3xx are normal.
 *
 * @internal
 */
export function isErrorStatus(status: number): boolean {
  return status >= 400;
}

/**
 * Dedupe/signature key for an entry: `METHOD URL` plus a hash of the normalized
 * request body (the query is already in the URL). Hashing keeps the key compact
 * regardless of body size; an empty body contributes an empty segment, so GET
 * entries key exactly as before. Including the body is what keeps distinct POST
 * payloads to the same URL from collapsing to one under {@link dedupeByRecency}.
 */
function entryKey(entry: HarEntry): string {
  const method = (entry.request.method || 'GET').toUpperCase();
  const canonicalBody = recordedBody(entry).canonical;
  const bodyKey = canonicalBody === '' ? '' : createHash('sha1').update(canonicalBody).digest('hex');
  return `${method} ${entry.request.url} ${bodyKey}`;
}

/**
 * A set of entries that share a full signature (`METHOD + URL + body`) but do
 * not agree on their response — so {@link dedupeByRecency} silently keeps only
 * the most recent. Surfaced so the ambiguity can be reported rather than hidden.
 *
 * @internal
 */
export interface HarCollision {
  /** The shared `METHOD URL` signature (body segment omitted for readability). */
  signature: string;
  /** How many entries share the signature. */
  count: number;
  /** How many materially-distinct responses those entries carry. */
  distinctResponses: number;
}

/** A response fingerprint (status + body text) used to detect real conflicts. */
function responseSignature(entry: HarEntry): string {
  return `${entry.response?.status ?? 0} ${entry.response?.content?.text ?? ''}`;
}

/** Human-readable signature (drops the body segment for messages). */
function readableSignature(entry: HarEntry): string {
  return `${(entry.request.method || 'GET').toUpperCase()} ${entry.request.url}`;
}

/**
 * Finds entries that collapse under {@link entryKey} but carry conflicting
 * responses. These are the cases where recency-dedupe makes a silent choice.
 *
 * @param entries - Entries about to be deduped.
 * @returns One {@link HarCollision} per conflicting signature (empty when none).
 *
 * @internal
 */
export function detectCollisions(entries: HarEntry[]): HarCollision[] {
  const groups = new Map<string, HarEntry[]>();
  for (const entry of entries) {
    const key = entryKey(entry);
    const group = groups.get(key) ?? [];
    group.push(entry);
    groups.set(key, group);
  }

  const collisions: HarCollision[] = [];
  for (const group of groups.values()) {
    if (group.length < 2) continue;
    const distinct = new Set(group.map(responseSignature));
    if (distinct.size > 1) {
      collisions.push({
        signature: readableSignature(group[0]),
        count: group.length,
        distinctResponses: distinct.size
      });
    }
  }
  return collisions;
}

/** Default collision reporter: a non-blocking console warning. */
function warnCollision(collision: HarCollision): void {
  // eslint-disable-next-line no-console
  console.warn(
    `HarFixture: ${collision.count} recorded entries share the signature ` +
      `"${collision.signature}" but carry ${collision.distinctResponses} distinct ` +
      `responses. Recency wins (the most-recently-recorded entry is used). ` +
      `Re-record to refresh, or scope fixtures so the signature is unique.`
  );
}

/** Epoch millis for an entry, preferring `_polarity.recordedAt`. */
function recordedAtMs(entry: HarEntry): number {
  const iso = entry._polarity?.recordedAt || entry.startedDateTime;
  const ms = Date.parse(iso);
  return Number.isNaN(ms) ? 0 : ms;
}

/**
 * Returns the most-recent entry per `method + URL`. Later entries with an equal
 * or newer timestamp replace earlier ones (last-write-wins on ties), matching
 * the append-only semantics of the SDK recorder.
 *
 * @param entries - Raw entries (possibly containing duplicates by URL+method).
 * @returns The effective entry set, one per `method + URL`.
 *
 * @internal
 */
export function dedupeByRecency(entries: HarEntry[]): HarEntry[] {
  const latest = new Map<string, HarEntry>();
  for (const entry of entries) {
    const key = entryKey(entry);
    const existing = latest.get(key);
    if (!existing || recordedAtMs(entry) >= recordedAtMs(existing)) {
      latest.set(key, entry);
    }
  }
  return Array.from(latest.values());
}

/**
 * Parses a HAR document from a JSON string.
 *
 * @param contents - Raw HAR 1.2 JSON text.
 * @returns The parsed {@link Har} document.
 *
 * @throws Error
 * Throws a descriptive error when the JSON is invalid or does not contain a
 * `log.entries` array.
 *
 * @internal
 */
export function parseHar(contents: string): Har {
  let parsed: unknown;
  try {
    parsed = JSON.parse(contents);
  } catch (cause) {
    throw new Error(
      `HarFixture: failed to parse HAR JSON: ${
        cause instanceof Error ? cause.message : String(cause)
      }`
    );
  }

  const har = parsed as Har;
  if (!har || !har.log || !Array.isArray(har.log.entries)) {
    throw new Error('HarFixture: invalid HAR document — expected a `log.entries` array.');
  }
  return har;
}

/**
 * Reads and parses a HAR file from disk.
 *
 * @param filePath - Absolute or relative path to a HAR 1.2 file.
 * @returns The parsed {@link Har} document.
 *
 * @throws Error
 * Throws a descriptive error when the file does not exist or is not valid HAR.
 *
 * @internal
 */
export function readHarFile(filePath: string): Har {
  if (!fs.existsSync(filePath)) {
    throw new Error(`HarFixture: HAR file not found at "${filePath}".`);
  }
  return parseHar(fs.readFileSync(filePath, 'utf8'));
}

/**
 * Flattens entries from one or more HAR documents, optionally sanitizing and
 * deduping by recency. Used by {@link HarFixture} to build its effective entry
 * set from `from()` / `merge()`.
 *
 * @param hars - One or more parsed HAR documents.
 * @param options - Loading behavior. `onCollision` is invoked once per
 *   conflicting signature before deduping (default: a `console.warn`); pass
 *   `null` to silence it.
 * @returns The flattened, sanitized, recency-deduped entries.
 *
 * @internal
 */
export function loadEntries(
  hars: Har[],
  options: {
    sanitize?: boolean;
    dedupe?: boolean;
    onCollision?: ((collision: HarCollision) => void) | null;
  } = {}
): HarEntry[] {
  const { sanitize = true, dedupe = true, onCollision = warnCollision } = options;
  let entries: HarEntry[] = [];
  for (const har of hars) {
    entries = entries.concat(har.log.entries);
  }
  if (sanitize) entries = sanitizeEntries(entries);
  if (dedupe) {
    if (onCollision) {
      for (const collision of detectCollisions(entries)) onCollision(collision);
    }
    entries = dedupeByRecency(entries);
  }
  return entries;
}
