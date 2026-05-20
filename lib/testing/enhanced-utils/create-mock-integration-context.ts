import type { IntegrationContext } from '@polarityio/integration-types';

/**
 * Factory function that creates mock functions. Pass `vi.fn` (Vitest)
 * or `jest.fn` (Jest) to get spy capabilities. When omitted, plain
 * no-op functions are used.
 *
 * @example
 * ```typescript
 * // Vitest — enables toHaveBeenCalledWith() assertions
 * const ctx = createMockIntegrationContext(vi.fn);
 *
 * // Jest
 * const ctx = createMockIntegrationContext(jest.fn);
 *
 * // No framework — plain no-ops
 * const ctx = createMockIntegrationContext();
 * ```
 * @public
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Must use `any` to match vi.fn/jest.fn signatures
export type MockFnFactory = () => (...args: any[]) => any;

const noOp: MockFnFactory = () => () => undefined;

/**
 * Creates a mock `IntegrationContext`
 * with stubbed logger, cache, and polling methods.
 *
 * Pass your testing framework's mock function factory to enable spy capabilities
 * (e.g., `toHaveBeenCalledWith()`). When omitted, plain no-op stubs are used.
 *
 * @param createMockFn - A factory that creates mock functions (e.g., `vi.fn` or `jest.fn`)
 * @returns A fully populated `IntegrationContext` with stubbed methods
 *
 * @group Testing
 * @public
 *
 * @example
 * ```typescript
 * // Vitest
 * const ctx = createMockIntegrationContext(vi.fn);
 *
 * // Jest
 * const ctx = createMockIntegrationContext(jest.fn);
 *
 * // No framework — plain no-ops
 * const ctx = createMockIntegrationContext();
 * ```
 */
export const createMockIntegrationContext = (
  createMockFn: MockFnFactory = noOp
): IntegrationContext => {
  const createCacheScope = () => ({
    get: createMockFn(),
    set: createMockFn(),
    delete: createMockFn()
  });

  const childFn = createMockFn();
  const logger = {
    child: childFn,
    info: createMockFn(),
    debug: createMockFn(),
    trace: createMockFn(),
    warn: createMockFn(),
    error: createMockFn(),
    fatal: createMockFn()
  } as unknown as IntegrationContext['logger'];

  // Make child() return the logger for method chaining
  if (
    typeof (childFn as unknown as { mockReturnValue?: unknown }).mockReturnValue ===
    'function'
  ) {
    (childFn as unknown as { mockReturnValue: (val: unknown) => void }).mockReturnValue(
      logger
    );
  } else {
    (logger as unknown as Record<string, unknown>).child = () => logger;
  }

  // Create a limiter schedule passthrough that executes the provided callback
  // (matching Bottleneck behavior) while remaining spyable.
  // Supports both schedule(fn, ...args) and schedule(options, fn, ...args) overloads.
  const scheduleImpl = async (fnOrOptions: unknown, ...rest: unknown[]) => {
    const fn = (typeof fnOrOptions === 'function' ? fnOrOptions : rest[0]) as (
      ...args: unknown[]
    ) => PromiseLike<unknown>;
    const args = typeof fnOrOptions === 'function' ? rest : rest.slice(1);
    return fn(...args);
  };

  const countsImpl = () => ({
    EXECUTING: 0,
    QUEUED: 0,
    RUNNING: 0,
    DONE: 0,
    RECEIVED: 0
  });

  const settingsImpl = () => ({});

  const scheduleMock = createMockFn();
  const countsMock = createMockFn();
  const settingsMock = createMockFn();
  const scopeMock = createMockFn();
  const updateSettingsMock = createMockFn();

  const hasMockImplementation =
    typeof (scheduleMock as unknown as { mockImplementation?: unknown })
      .mockImplementation === 'function';

  if (hasMockImplementation) {
    const setImpl = (mock: unknown, impl: unknown) =>
      (mock as { mockImplementation: (fn: unknown) => void }).mockImplementation(impl);

    setImpl(scheduleMock, scheduleImpl);
    setImpl(countsMock, countsImpl);
    setImpl(settingsMock, settingsImpl);
    setImpl(updateSettingsMock, async () => undefined);
    setImpl(scopeMock, () => ({
      schedule: scheduleMock
    }));
  }

  return {
    cache: {
      global: createCacheScope(),
      integration: createCacheScope(),
      user: createCacheScope()
    },
    integrationId: 'test-integration',
    userId: 1,
    logger,
    limiter: {
      schedule: (hasMockImplementation
        ? scheduleMock
        : scheduleImpl) as IntegrationContext['limiter']['schedule'],
      updateSettings: (hasMockImplementation
        ? updateSettingsMock
        : async () => undefined) as IntegrationContext['limiter']['updateSettings'],
      counts: (hasMockImplementation
        ? countsMock
        : countsImpl) as IntegrationContext['limiter']['counts'],
      settings: (hasMockImplementation
        ? settingsMock
        : settingsImpl) as IntegrationContext['limiter']['settings'],
      scope: (hasMockImplementation
        ? scopeMock
        : () => ({ schedule: scheduleImpl })) as IntegrationContext['limiter']['scope']
    },
    startPolling: createMockFn(),
    stopPolling: createMockFn()
  };
};
