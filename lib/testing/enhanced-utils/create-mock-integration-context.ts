import type { IntegrationContext } from '@polarityio/integration-types';

export const createMockIntegrationContext = (): IntegrationContext => {
  const cache = {
    global: {
      get: jest.fn(),
      set: jest.fn(),
      delete: jest.fn()
    },
    integration: {
      get: jest.fn(),
      set: jest.fn(),
      delete: jest.fn()
    },
    user: {
      get: jest.fn(),
      set: jest.fn(),
      delete: jest.fn()
    }
  };

  return {
    cache,
    integrationId: 'test-integration',
    userId: 1,
    logger: {
      child: jest.fn().mockReturnThis(),
      info: jest.fn(),
      debug: jest.fn(),
      trace: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      fatal: jest.fn()
    } as unknown as IntegrationContext['logger'],
    startPolling: jest.fn(),
    stopPolling: jest.fn()
  };
};
