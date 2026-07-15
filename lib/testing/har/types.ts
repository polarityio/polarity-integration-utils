/**
 * Canonical HAR 1.2 type definitions plus the Polarity-specific `_polarity`
 * extension attached to every entry by the SDK recorder.
 *
 * Spec: http://www.softwareishard.com/blog/har-12-spec/
 *
 * The HAR spec explicitly permits custom fields prefixed with an underscore,
 * so `_polarity` keeps the file valid for any standard HAR tooling while giving
 * the testing/mocking pipeline the entity metadata it needs to compute coverage.
 *
 * ──────────────────────────────────────────────────────────────────────────
 * SOURCE OF TRUTH for the HAR + `_polarity` contract (INT-2018 / INT-2020).
 *
 * This contract is shared across three components of the HAR fixture pipeline:
 * the SDK recorder (`polarity-integration-sdk`, the writer), the `HarFixture`
 * replay class in this library (the reader), and the CI staleness check in the
 * integrations monorepo. It lives under the runtime-free `testing` sub-path so
 * production integration code never imports it. The SDK should import these
 * types from `polarity-integration-utils/testing` and delete its local copy.
 * ──────────────────────────────────────────────────────────────────────────
 *
 * @packageDocumentation
 */

/**
 * A HAR name/value pair, used for headers, cookies, and query-string entries.
 *
 * @public
 */
export interface HarNameValue {
  name: string;
  value: string;
}

/**
 * The `postData` section of a HAR request.
 *
 * @public
 */
export interface HarPostData {
  mimeType: string;
  text?: string;
  params?: HarNameValue[];
}

/**
 * The `request` section of a HAR entry.
 *
 * @public
 */
export interface HarRequest {
  method: string;
  url: string;
  httpVersion: string;
  cookies: HarNameValue[];
  headers: HarNameValue[];
  queryString: HarNameValue[];
  postData?: HarPostData;
  headersSize: number;
  bodySize: number;
}

/**
 * The `response.content` section of a HAR entry.
 *
 * @public
 */
export interface HarContent {
  size: number;
  mimeType: string;
  text?: string;
}

/**
 * The `response` section of a HAR entry.
 *
 * @public
 */
export interface HarResponse {
  status: number;
  statusText: string;
  httpVersion: string;
  cookies: HarNameValue[];
  headers: HarNameValue[];
  content: HarContent;
  redirectURL: string;
  headersSize: number;
  bodySize: number;
}

/**
 * What kind of integration call produced an entry.
 *
 * - `"lookup"` — captured during `doLookup` (keyed by entity primary type)
 * - `"action"` — captured during an action's execute flow (keyed by action key)
 *
 * Entries written before this field existed have no `kind`; consumers MUST
 * treat a missing `kind` as `"lookup"` for backward compatibility.
 *
 * @public
 */
export type PolarityEntryKind = 'lookup' | 'action';

/**
 * Which phase of an action's execute flow produced an entry.
 *
 * @public
 */
export type PolarityActionPhase = 'validate' | 'execute';

/**
 * Polarity-specific metadata attached to each entry so the testing/mocking
 * pipeline can attribute a captured HTTP exchange to the call that triggered
 * it and compute coverage.
 *
 * @public
 */
export interface PolarityEntryMeta {
  /**
   * Discriminator for how the entry was produced. Optional for backward
   * compatibility — absent means `"lookup"`.
   */
  kind?: PolarityEntryKind;
  /** Single Polarity entity type identifier, e.g. `"IPv4"`, `"cve"`, `"custom.<key>"`. */
  type: string;
  /** Full Polarity types array, e.g. `["IP", "IPv4"]`. */
  types: string[];
  /** The primary (most general) `types[]` element. The HAR file key for lookups. */
  primaryType: string;
  /** The entity value/IOC that triggered the call (kept, not redacted). */
  entityValue: string;
  /** ISO timestamp of when this entry was recorded. Used for recency dedupe. */
  recordedAt: string;
  /**
   * True when this entry was captured during a lookup that mixed multiple
   * primary types, meaning per-entity attribution is best-effort.
   */
  ambiguousAttribution?: boolean;

  // ── Action-only fields (present when kind === "action") ──────────────────
  /** The action key (`config.json` `actions[].key`). The HAR file key for actions. */
  actionKey?: string;
  /** Which phase of the execute flow produced this entry. */
  phase?: PolarityActionPhase;
}

/**
 * A single recorded HTTP exchange within a HAR log.
 *
 * @public
 */
export interface HarEntry {
  startedDateTime: string;
  time: number;
  request: HarRequest;
  response: HarResponse;
  cache: Record<string, never>;
  timings: { send: number; wait: number; receive: number };
  _polarity?: PolarityEntryMeta;
}

/**
 * The `log.creator` section of a HAR file.
 *
 * @public
 */
export interface HarCreator {
  name: string;
  version: string;
}

/**
 * The `log` section of a HAR file.
 *
 * @public
 */
export interface HarLog {
  version: '1.2';
  creator: HarCreator;
  entries: HarEntry[];
}

/**
 * A parsed HAR 1.2 document.
 *
 * @public
 */
export interface Har {
  log: HarLog;
}
