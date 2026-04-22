import type { Integration } from '@polarityio/integration-types';
import { validateIntegration } from '../enhanced-utils/validate-integration';
import { testDoLookup } from './test-do-lookup';
import { testOnMessage } from './test-on-message';

export const createIntegrationTests = (integration: Integration) => {
  validateIntegration(integration);

  return {
    testDoLookup: testDoLookup.bind(null, integration),
    testOnMessage: testOnMessage.bind(null, integration)
  };
};
