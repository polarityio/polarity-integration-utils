import { DoLookupUserOptions, Integration } from '../../types';
import { createMockIntegrationContext } from '../enhanced-utils/create-mock-integration-context';

export const testOnMessage = (
  integration: Integration,
  description: string,
  {
    command,
    args,
    expected,
    options = {}
  }: {
    command: string;
    args: Record<string, unknown>;
    expected: unknown;
    options?: DoLookupUserOptions;
  }
) => {
  test(description, async () => {
    const mockLogger = {
      info: jest.fn(),
      debug: jest.fn(),
      trace: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      fatal: jest.fn()
    };
    await integration.startup(mockLogger);
    const context = createMockIntegrationContext();
    if (typeof integration.onMessage !== 'function') {
      throw new Error('Integration does not have an onMessage method.');
    }
    const result = await integration.onMessage({ command, ...args }, options, context);
    expect(result).toEqual(expected);
  });
};
