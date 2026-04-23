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
    const context = createMockIntegrationContext();
    await integration.startup(context.logger);
    const result = await integration.doLookup(entities, options, context);
    expect(result).toEqual(expected);
  });
};
