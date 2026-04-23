import type { Integration } from '@polarityio/integration-types';
import { testDoLookup } from './test-do-lookup';
import { testOnMessage } from './test-on-message';

/**
 * Creates a test harness for an integration with pre-bound test helpers.
 *
 * Returns an object with `testDoLookup` and `testOnMessage` methods that
 * automatically call `integration.startup()` before each test.
 *
 * @param integration - The integration module to test
 * @returns An object with `testDoLookup` and `testOnMessage` test helpers
 *
 * @example
 * ```typescript
 * import * as integration from '../src/integration';
 * import { createIntegrationTests } from 'polarity-integration-utils/testing';
 *
 * const { testDoLookup } = createIntegrationTests(integration);
 *
 * testDoLookup('should return results', {
 *   entities: [createEntity('IPv4', '8.8.8.8')],
 *   options: { apiKey: 'test-key' },
 *   expected: [{ entity: expect.any(Object), data: expect.any(Object) }]
 * });
 * ```
 */
export const createIntegrationTests = (integration: Integration) => {
  return {
    testDoLookup: testDoLookup.bind(null, integration),
    testOnMessage: testOnMessage.bind(null, integration)
  };
};
