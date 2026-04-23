import type { DoLookupUserOptions, Integration } from '@polarityio/integration-types';
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
    const context = createMockIntegrationContext();
    await integration.startup(context.logger);
    if (typeof integration.onMessage !== 'function') {
      throw new Error('Integration does not have an onMessage method.');
    }
    const result = await integration.onMessage({ command, ...args }, options, context);
    expect(result).toEqual(expected);
  });
};
