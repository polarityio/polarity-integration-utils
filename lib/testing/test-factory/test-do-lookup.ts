import type { DoLookupResult, DoLookupUserOptions, Entity, Integration } from '@polarityio/integration-types';
import { createMockIntegrationContext } from '../enhanced-utils/create-mock-integration-context';

export const testDoLookup = (
  integration: Integration,
  description: string,
  {
    entities,
    options,
    expected
  }: {
    entities: Entity[];
    options: DoLookupUserOptions;
    expected: DoLookupResult;
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
    const result = await integration.doLookup(entities, options, context);
    expect(result).toEqual(expected);
  });
};
