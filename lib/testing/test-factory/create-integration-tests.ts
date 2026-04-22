import type { Integration } from '@polarityio/integration-types';
import { testDoLookup } from './test-do-lookup';
import { testOnMessage } from './test-on-message';

export const createIntegrationTests = (integration: Integration) => {
  return {
    testDoLookup: testDoLookup.bind(null, integration),
    testOnMessage: testOnMessage.bind(null, integration)
  };
};
