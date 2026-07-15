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
 * matcher consumes the deduped entries to short-circuit `PolarityRequest.run()`.
 *
 * @packageDocumentation
 */

import fs from 'fs';
import type { Har, HarEntry } from './types';
import { sanitizeEntries } from './sanitizer';

/**
 * Returns true when an HTTP status should be treated as an error fixture.
 * Per the INT-2019 convention, only 4xx/5xx are errors; 2xx and 3xx are normal.
 *
 * @internal
 */
export function isErrorStatus(status: number): boolean {
  return status >= 400;
}

/** Dedupe key for an entry: METHOD + URL (query included). */
function entryKey(entry: HarEntry): string {
  return `${(entry.request.method || 'GET').toUpperCase()} ${entry.request.url}`;
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
 * @param options - Loading behavior.
 * @returns The flattened, sanitized, recency-deduped entries.
 *
 * @internal
 */
export function loadEntries(
  hars: Har[],
  options: { sanitize?: boolean; dedupe?: boolean } = {}
): HarEntry[] {
  const { sanitize = true, dedupe = true } = options;
  let entries: HarEntry[] = [];
  for (const har of hars) {
    entries = entries.concat(har.log.entries);
  }
  if (sanitize) entries = sanitizeEntries(entries);
  if (dedupe) entries = dedupeByRecency(entries);
  return entries;
}
