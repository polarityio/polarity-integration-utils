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
      child: jest.fn().mockReturnThis(),
      info: jest.fn(),
      debug: jest.fn(),
      trace: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      fatal: jest.fn()
    } as unknown as Parameters<typeof integration.startup>[0];
    await integration.startup(mockLogger);
    const context = createMockIntegrationContext();
    if (typeof integration.onMessage !== 'function') {
      throw new Error('Integration does not have an onMessage method.');
    }
    const result = await integration.onMessage({ command, ...args }, options, context);
    expect(result).toEqual(expected);
  });
};
