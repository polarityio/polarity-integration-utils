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
 */
export type MockFnFactory = () => (...args: any[]) => any;

const noOp: MockFnFactory = () => () => undefined;

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
  if (typeof (childFn as any).mockReturnValue === 'function') {
    (childFn as any).mockReturnValue(logger);
  } else {
    (logger as any).child = () => logger;
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
    startPolling: createMockFn(),
    stopPolling: createMockFn()
  };
};
