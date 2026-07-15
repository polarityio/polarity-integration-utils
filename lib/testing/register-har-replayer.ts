/**
 * Wires a {@link HarFixture} into the `PolarityRequest.run()` replay seam.
 *
 * This is the test/dev-only bridge between the HAR replay core (which lives
 * here under `polarity-integration-utils/testing`) and the inert seam (which
 * lives in `polarity-integration-utils/requests`). Production integration code
 * never imports this module, so the production import graph stays free of
 * fixture/replay logic — only the dormant, unregistered seam remains.
 *
 * Typical usage is in a deployed/multi-container test harness that runs inside
 * the integration runtime and registers fixtures at startup:
 *
 * ```typescript
 * import { HarFixture, registerHarReplayer } from 'polarity-integration-utils/testing';
 *
 * const unregister = registerHarReplayer(
 *   HarFixture.merge([
 *     HarFixture.from('./mocks/lookups/IP.har'),
 *     HarFixture.from('./mocks/lookups/domain.har')
 *   ])
 * );
 *
 * // ...run the test target; every PolarityRequest.run() is now fixture-backed...
 *
 * unregister(); // restore live behavior
 * ```
 *
 * @packageDocumentation
 */

import {
  registerReplaySeam,
  clearReplaySeam,
  NO_REPLAY,
  type SeamReplayResult
} from '../requests/replay-seam';
import type { HttpRequestOptions } from '../requests/polarity-request';
import { HarFixture } from './har-fixture';
import type { HarFixtureOptions } from './har/matcher';
import { isReplayMiss } from './har/matcher';

/**
 * What a registered fixture does when no entry matches a request.
 *
 * - `'throw'` — the seam throws a legible replay-miss error in `run()`
 *   (default; matches the SDK replayer's hard-fail semantics).
 * - `'passthrough'` — the request falls through to the live network.
 *
 * This mirrors {@link HarFixtureOptions.onMiss} but is surfaced here because the
 * miss policy is enforced at the seam, not inside the fixture.
 *
 * @public
 */
export type RegisteredOnMiss = 'throw' | 'passthrough';

/**
 * Options for {@link registerHarReplayer}.
 *
 * @public
 */
export interface RegisterHarReplayerOptions extends HarFixtureOptions {
  /**
   * Miss policy enforced at the seam. Overrides the fixture's own `onMiss` for
   * the purposes of the deployed replay path.
   *
   * @defaultValue 'throw'
   */
  onMiss?: RegisteredOnMiss;
}

/**
 * Coerces the input into a single {@link HarFixture}.
 */
function toFixture(
  input: HarFixture | HarFixture[] | string | string[],
  options?: HarFixtureOptions
): HarFixture {
  if (input instanceof HarFixture) return input;
  if (Array.isArray(input)) {
    if (input.length === 0) {
      throw new Error('registerHarReplayer: received an empty array of fixtures/paths.');
    }
    if (input[0] instanceof HarFixture) {
      return HarFixture.merge(input as HarFixture[], options);
    }
    return HarFixture.merge(
      (input as string[]).map((p) => HarFixture.from(p, options)),
      options
    );
  }
  return HarFixture.from(input, options);
}

/**
 * Registers a HAR fixture (or fixtures, or HAR file paths) with the
 * `PolarityRequest.run()` seam so that every request is served from recorded
 * fixtures instead of hitting the network.
 *
 * @param input - A {@link HarFixture}, an array of fixtures, a HAR file path, or
 *   an array of HAR file paths. Multiple inputs are merged (recency wins).
 * @param options - Matching behavior and seam-level miss policy.
 * @returns A function that unregisters the replayer and restores live behavior.
 *
 * @group Testing
 * @public
 */
export function registerHarReplayer(
  input: HarFixture | HarFixture[] | string | string[],
  options: RegisterHarReplayerOptions = {}
): () => void {
  const onMiss: RegisteredOnMiss = options.onMiss ?? 'throw';
  const fixture = toFixture(input, options);
  const replayer = fixture.asReplayer();

  const seamFn = (requestOptions: HttpRequestOptions): SeamReplayResult => {
    const result = replayer(requestOptions);
    if (isReplayMiss(result)) {
      if (onMiss === 'passthrough') return NO_REPLAY;
      return { replayMiss: true, description: result.description };
    }
    return result;
  };

  return registerReplaySeam(seamFn);
}

/**
 * Clears any registered HAR replayer, restoring the inert production seam
 * behavior. Equivalent to calling the unregister function returned by
 * {@link registerHarReplayer}, but convenient for global test teardown.
 *
 * @group Testing
 * @public
 */
export function clearHarReplayer(): void {
  clearReplaySeam();
}
