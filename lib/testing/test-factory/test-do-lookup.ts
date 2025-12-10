import { DoLookupResult, DoLookupUserOptions, Entity, Integration } from '../../types';
import { DoLookupResultSchema } from '../../zod-types';
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
      info: jest.fn(),
      debug: jest.fn(),
      trace: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      fatal: jest.fn()
    };
    await integration.startup(mockLogger);
    const context = createMockIntegrationContext();
    const result = await integration.doLookup(entities, options, context);
    const validationResult = DoLookupResultSchema.safeParse(result);
    expect(validationResult.success).toBe(true);
    expect(result).toEqual(expected);
  });
};
