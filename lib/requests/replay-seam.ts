/**
 * Inert replay seam for {@link PolarityRequest.run}.
 *
 * Per the G4 "HAR Replay Delivery & Test-Only Exclusion" decision, the
 * production egress path must be byte-for-byte unchanged unless a testing-only
 * module explicitly registers a replayer. This module is that seam:
 *
 *   - It contains **no HAR parsing, matching, or fixture logic** — only a
 *     nullable function slot and a tiny `maybeReplay` shim.
 *   - In production nothing ever calls {@link registerReplaySeam}, so the slot
 *     stays `null` and {@link maybeReplay} returns `NO_REPLAY` immediately — a
 *     single null check, no behavioral change.
 *   - The actual replay engine lives under `polarity-integration-utils/testing`
 *     (never imported by production integration code) and registers itself here
 *     at test/dev startup.
 *
 * Keeping the seam in `requests` (not `testing`) is deliberate: `run()` must be
 * able to call it without importing the test-only sub-path, which would pull
 * fixture logic into the production import graph.
 *
 * @packageDocumentation
 */

import type { HttpRequestOptions, HttpRequestResponse } from './polarity-request';

/**
 * Sentinel meaning "no replayer is registered, or the registered replayer had
 * no fixture for this request — proceed with the live request."
 *
 * @public
 */
export const NO_REPLAY = Symbol('polarity.requests.no-replay');

/**
 * What a registered replayer returns for a single request:
 *
 * - a synthesized {@link HttpRequestResponse} — replay hit; skip the network.
 * - `NO_REPLAY` — no fixture matched; the caller must perform the live request.
 * - a `{ replayMiss: true }` object — a fixture set is registered but had no
 *   match and is configured to hard-fail; `run()` throws a legible error.
 *
 * @public
 */
export type SeamReplayResult =
  | HttpRequestResponse
  | typeof NO_REPLAY
  | { replayMiss: true; description: string };

/**
 * A replayer function registered by the testing harness. Receives the
 * fully-processed request options (after `beforeRequest` hooks) so it matches
 * exactly what the integration would have sent.
 *
 * @public
 */
export type RegisteredReplayer = (requestOptions: HttpRequestOptions) => SeamReplayResult;

let registeredReplayer: RegisteredReplayer | null = null;

/**
 * Registers a replayer used by {@link maybeReplay}. Called only by the
 * testing harness (e.g. `registerHarReplayer` from
 * `polarity-integration-utils/testing`). Never called in production.
 *
 * @param replayer - The replayer to install, or `null` to clear.
 * @returns A function that unregisters this replayer (restores the prior one).
 *
 * @group Requests
 * @public
 */
export function registerReplaySeam(replayer: RegisteredReplayer | null): () => void {
  const previous = registeredReplayer;
  registeredReplayer = replayer;
  return () => {
    registeredReplayer = previous;
  };
}

/**
 * Removes any registered replayer, restoring the inert production behavior.
 *
 * @group Requests
 * @public
 */
export function clearReplaySeam(): void {
  registeredReplayer = null;
}

/**
 * Returns true when a replayer is currently registered. Used by tests and by
 * `run()` to skip work entirely in the common (production) case.
 *
 * @group Requests
 * @public
 */
export function isReplaySeamActive(): boolean {
  return registeredReplayer !== null;
}

/**
 * The seam invoked by {@link PolarityRequest.run} after `beforeRequest` hooks
 * and before the live request. When no replayer is registered (production),
 * this returns {@link NO_REPLAY} after a single null check.
 *
 * @param requestOptions - The fully-processed outgoing request options.
 * @returns A {@link SeamReplayResult}.
 *
 * @group Requests
 * @public
 */
export function maybeReplay(requestOptions: HttpRequestOptions): SeamReplayResult {
  if (registeredReplayer === null) return NO_REPLAY;
  return registeredReplayer(requestOptions);
}
