import { IntegrationContext } from '../../context';

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
    userId: 'test-user',
    logger: {
      info: jest.fn(),
      debug: jest.fn(),
      trace: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      fatal: jest.fn()
    }
  };
};
