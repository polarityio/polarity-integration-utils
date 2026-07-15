/**
 * `HarFixture` — load a recorded HAR file and replay it as a drop-in mock for
 * `PolarityRequest.run()`.
 *
 * Turns a hand-written `PolarityRequest.run()` stub into a one-liner backed by
 * real captured vendor data:
 *
 * ```typescript
 * import { HarFixture } from 'polarity-integration-utils/testing';
 *
 * // Jest
 * jest.mock('polarity-integration-utils/requests', () =>
 *   HarFixture.from('./mocks/lookups/IP.har').asPolarityRequest()
 * );
 *
 * // Vitest
 * vi.mock('polarity-integration-utils/requests', () =>
 *   HarFixture.from('./mocks/lookups/IP.har').asPolarityRequest()
 * );
 * ```
 *
 * `HarFixture` is the Tier-1 (in-repo unit test) convenience. The same HAR
 * replay core (loader + matcher) is also consumed by the external HAR mock
 * proxy that serves the deployed, multi-container test path (see INT-2191);
 * that path does not use this class.
 *
 * @packageDocumentation
 */

import type {
  HttpRequestOptions,
  HttpRequestResponse
} from '../requests/polarity-request';
import type { Har, HarEntry } from './har/types';
import { readHarFile, parseHar, loadEntries } from './har/loader';
import {
  resolveOptions,
  replay,
  isReplayMiss,
  type HarFixtureOptions,
  type ResolvedHarFixtureOptions
} from './har/matcher';
import type { MockFnFactory } from './enhanced-utils/create-mock-integration-context';

/**
 * A mock `run` function compatible with both `jest.fn()` and `vi.fn()` return
 * types. It accepts request options and resolves to a synthesized response
 * (or `undefined` on a `'return-null'` / `'passthrough'` miss).
 *
 * @public
 */
export type HarReplayFn = (
  requestOptions: HttpRequestOptions
) => Promise<HttpRequestResponse | undefined>;

const noOpFactory: MockFnFactory = () => () => undefined;

/**
 * Loads recorded HAR fixtures and replays matching entries as
 * `PolarityRequest`-compatible responses.
 *
 * Construct via the static {@link HarFixture.from} (single file) or
 * {@link HarFixture.merge} (multiple files / fixtures). Then use:
 *
 * - {@link HarFixture.asMock} — a `run` mock function for hand-rolled mocks.
 * - {@link HarFixture.asPolarityRequest} — a full `vi.mock()` / `jest.mock()`
 *   factory replacing the `PolarityRequest` class.
 *
 * The deployed/multi-container test path is served by the external HAR mock
 * proxy (INT-2191), which reuses the same match engine — not this class.
 *
 * @group Testing
 * @public
 */
export class HarFixture {
  private readonly entries: HarEntry[];
  private readonly options: ResolvedHarFixtureOptions;

  private constructor(entries: HarEntry[], options: ResolvedHarFixtureOptions) {
    this.entries = entries;
    this.options = options;
  }

  /**
   * Loads a single HAR file from disk and builds a fixture.
   *
   * @param filePath - Path to a HAR 1.2 file (e.g. `./mocks/lookups/IP.har`).
   * @param options - Matching / miss-handling behavior.
   * @returns A new {@link HarFixture}.
   *
   * @throws Error
   * Throws when the file is missing or is not valid HAR.
   */
  public static from(filePath: string, options?: HarFixtureOptions): HarFixture {
    const har = readHarFile(filePath);
    return HarFixture.fromHar(har, options);
  }

  /**
   * Builds a fixture from a HAR JSON string (useful for inline/hand-authored
   * fixtures in unit tests, with no filesystem access).
   *
   * @param contents - Raw HAR 1.2 JSON text.
   * @param options - Matching / miss-handling behavior.
   * @returns A new {@link HarFixture}.
   */
  public static fromString(contents: string, options?: HarFixtureOptions): HarFixture {
    return HarFixture.fromHar(parseHar(contents), options);
  }

  /**
   * Builds a fixture from one or more already-parsed HAR documents.
   *
   * @param har - A single HAR document or an array of them.
   * @param options - Matching / miss-handling behavior.
   * @returns A new {@link HarFixture}.
   */
  public static fromHar(har: Har | Har[], options?: HarFixtureOptions): HarFixture {
    const hars = Array.isArray(har) ? har : [har];
    const entries = loadEntries(hars);
    return new HarFixture(entries, resolveOptions(options));
  }

  /**
   * Combines multiple fixtures (or HAR files) into a single fixture. Entries
   * are concatenated then recency-deduped, so on a `method + URL` conflict the
   * most-recently-recorded entry wins (last-write-wins).
   *
   * @param fixtures - Fixtures to merge. Their entries are pooled together.
   * @param options - Matching options for the merged fixture. When omitted, the
   *   options of the first fixture are used.
   * @returns A new merged {@link HarFixture}.
   *
   * @example
   * ```typescript
   * const fixture = HarFixture.merge([
   *   HarFixture.from('./mocks/lookups/IP.har'),
   *   HarFixture.from('./mocks/lookups/domain.har')
   * ]);
   * ```
   */
  public static merge(fixtures: HarFixture[], options?: HarFixtureOptions): HarFixture {
    const pooled = fixtures.flatMap((fixture) => fixture.entries);
    // Re-dedupe the pooled set so cross-file URL collisions resolve by recency.
    const deduped = loadEntries(
      [{ log: { version: '1.2', creator: { name: '', version: '' }, entries: pooled } }],
      { sanitize: false }
    );
    const resolved = options
      ? resolveOptions(options)
      : (fixtures[0]?.options ?? resolveOptions());
    return new HarFixture(deduped, resolved);
  }

  /**
   * The effective (sanitized, recency-deduped) entries backing this fixture.
   *
   * @returns A shallow copy of the entries.
   */
  public getEntries(): HarEntry[] {
    return [...this.entries];
  }

  /**
   * Returns an `async` mock function compatible with `jest.fn()` / `vi.fn()`
   * that replays matching entries. Pass your framework's mock factory to make
   * the returned function a spy (so `toHaveBeenCalledWith()` works); when
   * omitted, a plain async function is returned.
   *
   * On a miss, behavior follows the fixture's `onMiss` option: `'throw'` throws
   * a descriptive error; `'return-null'` and `'passthrough'` resolve to
   * `undefined`.
   *
   * @param createMockFn - Optional mock factory (`jest.fn` / `vi.fn`).
   * @returns A {@link HarReplayFn}, optionally spy-wrapped.
   *
   * @example
   * ```typescript
   * const run = HarFixture.from('./mocks/lookups/IP.har').asMock(jest.fn);
   * ```
   */
  public asMock(createMockFn: MockFnFactory = noOpFactory): HarReplayFn {
    const impl: HarReplayFn = async (requestOptions: HttpRequestOptions) => {
      const result = replay(this.entries, requestOptions, this.options);
      if (isReplayMiss(result)) {
        if (this.options.onMiss === 'throw') {
          throw new Error(
            `HarFixture: no recorded HAR entry matched ${result.description}. ` +
              `Record this request with the SDK (--record-har) or adjust ` +
              `matchBy/ignoreQueryString.`
          );
        }
        return undefined;
      }
      return result;
    };

    const mock = createMockFn();
    const hasMockImplementation =
      typeof (mock as unknown as { mockImplementation?: unknown }).mockImplementation ===
      'function';

    if (hasMockImplementation) {
      (
        mock as unknown as { mockImplementation: (fn: HarReplayFn) => void }
      ).mockImplementation(impl);
      return mock as unknown as HarReplayFn;
    }

    return impl;
  }

  /**
   * Returns a module-shape object suitable for `vi.mock()` / `jest.mock()` of
   * `polarity-integration-utils/requests`. The returned `PolarityRequest` is a
   * constructor stub whose instances expose a HAR-backed `run()` (and a
   * `runInParallel()` that maps over it), so integration code under test gets
   * fixture-driven responses with no other changes.
   *
   * @param createMockFn - Optional mock factory (`jest.fn` / `vi.fn`) used for
   *   the spies on the returned instance.
   * @returns A partial `polarity-integration-utils/requests` module mock.
   *
   * @example
   * ```typescript
   * jest.mock('polarity-integration-utils/requests', () =>
   *   HarFixture.from('./mocks/lookups/IP.har').asPolarityRequest()
   * );
   * ```
   */
  public asPolarityRequest(createMockFn: MockFnFactory = noOpFactory): {
    PolarityRequest: new (...args: unknown[]) => unknown;
  } {
    const run = this.asMock(createMockFn);

    const runInParallel = async (options: {
      allRequestOptions: HttpRequestOptions[];
      returnErrors?: boolean;
    }) => {
      const all = options?.allRequestOptions ?? [];
      const returnErrors = options?.returnErrors ?? false;
      const results: (HttpRequestResponse | undefined)[] = [];
      for (const requestOptions of all) {
        try {
          const response = await run(requestOptions);
          if (response) {
            if (requestOptions.entity) response.entity = requestOptions.entity;
            else if (requestOptions.entities) response.entities = requestOptions.entities;
            else if (requestOptions.requestId)
              response.requestId = requestOptions.requestId;
          }
          results.push(response);
        } catch (error) {
          if (returnErrors) {
            results.push({ error } as unknown as HttpRequestResponse);
          } else {
            throw error;
          }
        }
      }
      return results;
    };

    // A constructor stub: each `new PolarityRequest(...)` yields an instance
    // whose `run`/`runInParallel` are HAR-backed. `userOptions`, `network`,
    // `limiter`, and `hooks` are present so integration setup code that assigns
    // them does not blow up.
    function PolarityRequestMock(this: Record<string, unknown>) {
      this.run = run;
      this.runInParallel = runInParallel;
      this.userOptions = null;
      this.network = null;
      this.limiter = null;
      this.hooks = {
        beforeRequest: [],
        afterResponse: [],
        onApiError: [],
        onNetworkError: []
      };
    }

    return {
      PolarityRequest: PolarityRequestMock as unknown as new (
        ...args: unknown[]
      ) => unknown
    };
  }
}
