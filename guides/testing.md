# Integration Testing Guide

This guide shows integration developers how to use `polarity-integration-utils/testing` to create comprehensive test suites for their integrations (v2).

## Quick Setup

1.  **Install testing dependencies:**

    ```bash
    npm install --save-dev jest @types/jest ts-jest
    ```

    _Note: `ts-jest` is recommended for TypeScript integrations._

2.  **Ensure TypeScript Configuration:**

    For TypeScript integrations, ensure your `tsconfig.json` has `esModuleInterop` enabled:

    ```json
    {
      "compilerOptions": {
        "esModuleInterop": true
      }
    }
    ```

3.  **Create a test file** (e.g., `test/integration.test.ts`):

    ```typescript
    import {
      createEntity,
      createMockIntegrationContext
    } from 'polarity-integration-utils/testing';
    import * as integration from '../src/integration'; // Adjust path to your integration entry point

    describe('Integration Tests', () => {
      test('should return results for 8.8.8.8', async () => {
        const entities = [createEntity('IP', '8.8.8.8')];
        const options = { apiKey: 'test-key' };
        const context = createMockIntegrationContext();

        const result = await integration.doLookup(entities, options, context);

        expect(result).toHaveLength(1);
        expect(result[0].entity.value).toBe('8.8.8.8');
      });
    });
    ```

4.  **Add test script to package.json:**

    ```json
    {
      "scripts": {
        "test": "jest"
      }
    }
    ```

5.  **Run tests:**
    ```bash
    npm test
    ```

## Testing Strategies

### 1. Custom Functional Testing (Recommended)

For more control and complex scenarios, use the `createMockIntegrationContext` helper and standard Jest assertions.

#### Testing `doLookup`

```typescript
import {
  createEntity,
  createMockIntegrationContext
} from 'polarity-integration-utils/testing';
import * as integration from '../src/integration';

describe('doLookup Functionality', () => {
  let context;

  beforeEach(() => {
    context = createMockIntegrationContext();
  });

  test('should handle IP entities', async () => {
    const entities = [createEntity('IP', '8.8.8.8')];
    const options = { apiKey: 'test-key' };

    const result = await integration.doLookup(entities, options, context);

    expect(result).toHaveLength(1);
    expect(result[0].entity.value).toBe('8.8.8.8');
    expect(result[0].data.summary).toBeDefined();
  });

  test('should handle empty results', async () => {
    const entities = [createEntity('domain', 'nonexistent.com')];
    const options = { apiKey: 'test-key' };

    const result = await integration.doLookup(entities, options, context);

    expect(result).toHaveLength(0); // or null/undefined depending on implementation
  });
});
```

### 3. Error Handling

Test how your integration handles various error conditions.

```typescript
import { IntegrationError } from 'polarity-integration-utils';

describe('Error Handling', () => {
  test('should throw IntegrationError on API failure', async () => {
    const entities = [createEntity('domain', 'error.com')];
    const options = { apiKey: 'invalid-key' };
    const context = createMockIntegrationContext();

    await expect(
      integration.doLookup(entities, options, context)
    ).rejects.toThrow(IntegrationError);
  });
});
```

### 4. Testing `validateOptions`

Test option validation logic.

```typescript
import type { ValidateOptionsUserOptions } from 'polarity-integration-utils';

describe('validateOptions', () => {
  const context = createMockIntegrationContext();

  test('should pass valid options', () => {
    const options: ValidateOptionsUserOptions = {
      apiKey: {
        key: 'apiKey',
        value: 'valid-key',
        integration_id: 'test-integration',
        user_can_edit: true,
        admin_only: false
      }
    };
    const errors = integration.validateOptions(options, context);
    expect(errors).toHaveLength(0);
  });

  test('should fail missing required options', () => {
    const options: ValidateOptionsUserOptions = {
      apiKey: {
        key: 'apiKey',
        value: '',
        integration_id: 'test-integration',
        user_can_edit: true,
        admin_only: false
      }
    };
    const errors = integration.validateOptions(options, context);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].key).toBe('apiKey');
  });
});
```

### 5. Mocking Cache

The `createMockIntegrationContext` helper provides a mock cache implementation that you can inspect.

```typescript
describe('Cache Operations', () => {
  test('should cache lookup results', async () => {
    const context = createMockIntegrationContext();
    // Mock cache implementation if needed, defaults are jest.fn()
    const cacheStore = new Map();
    context.cache.global.get.mockImplementation((key) => cacheStore.get(key));
    context.cache.global.set.mockImplementation((key, value) =>
      cacheStore.set(key, value)
    );

    const entities = [createEntity('IP', '8.8.8.8')];
    const options = { apiKey: 'test-key' };

    // First lookup (cache miss)
    await integration.doLookup(entities, options, context);

    expect(context.cache.global.set).toHaveBeenCalled();
  });
});
```

## Available Utilities

### `createEntity(type, value)`

Creates a fully formed `Entity` object for testing.

- `type`: string (e.g., 'IP', 'domain', 'hash')
- `value`: string

### `createMockIntegrationContext()`

Creates a mock `IntegrationContext` object with mocked logger and cache.

- `context.logger`: Jest mocks for all log levels.
- `context.cache`: Jest mocks for `get`, `set`, `delete`.

## Best Practices

1.  **Use Async/Await**: v2 integrations rely on Promises. Avoid callbacks in tests.
2.  **Test Edge Cases**: Use `createEntity` with various types and values.
3.  **Mock Context**: Always pass a mock context to `doLookup` to prevent runtime errors with logger/cache.
4.  **Clean Mocks**: Use `jest.clearAllMocks()` or `beforeEach` to reset mock state.
