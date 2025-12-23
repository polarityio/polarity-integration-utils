# Integration Testing Guide

This guide shows integration developers how to use `polarity-integration-utils/testing` to create comprehensive test suites for their integrations (v2).

## Quick Setup

1.  **Install testing dependencies:**

    ```bash
    npm install --save-dev jest @types/jest ts-jest
    ```

    _Note: `ts-jest` is recommended for TypeScript integrations._

2.  **Ensure TypeScript Configuration:**

    To import your `config.json` for validation, ensure your `tsconfig.json` has `resolveJsonModule` enabled:

    ```json
    {
      "compilerOptions": {
        "resolveJsonModule": true,
        "esModuleInterop": true
      }
    }
    ```

3.  **Create a test file** (e.g., `test/integration.test.ts`):

    ```typescript
    import {
      validateIntegration,
      createEntity,
      createMockIntegrationContext
    } from 'polarity-integration-utils/testing';
    import { IntegrationConfig } from 'polarity-integration-utils';
    import * as integration from '../src/integration'; // Adjust path to your integration entry point
    import config from '../config/config.json';

    describe('Integration Tests', () => {
      // 1. Runtime Validation
      test('should pass runtime validation checks', () => {
        const result = validateIntegration(integration, config as IntegrationConfig);

        if (result.warnings.length > 0) {
          console.warn('Validation Warnings:', result.warnings);
        }

        expect(result.isValid).toBe(true);
        expect(result.errors).toEqual([]);
      });

      // 2. Functional Tests
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

### 1. Runtime Validation (Required)

Every integration should validate its structure and configuration against the strict schema requirements. This ensures your integration implements the required interface correctly.

```typescript
import { validateIntegration } from 'polarity-integration-utils/testing';
import { IntegrationConfig } from 'polarity-integration-utils';
import * as integration from '../src/integration';
import config from '../config/config.json';

describe('Validation', () => {
  test('should match integration contract', () => {
    // Validates functions (startup, doLookup), signatures, and config.json
    const result = validateIntegration(integration, config as IntegrationConfig);

    expect(result.isValid).toBe(true);
    expect(result.errors).toEqual([]);
  });
});
```

### 2. Custom Functional Testing (Recommended)

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
  test('should return IntegrationError on API failure', async () => {
    const entities = [createEntity('domain', 'error.com')];
    const options = { apiKey: 'invalid-key' };
    const context = createMockIntegrationContext();

    const result = await integration.doLookup(entities, options, context);

    expect(result).toBeInstanceOf(IntegrationError);
    // OR if your integration throws:
    // await expect(integration.doLookup(entities, options, context)).rejects.toThrow();
  });
});
```

### 4. Testing `validateOptions`

Test option validation logic.

```typescript
describe('validateOptions', () => {
  const context = createMockIntegrationContext();

  test('should pass valid options', () => {
    const options = { apiKey: 'valid-key' };
    const errors = integration.validateOptions(options, context);
    expect(errors).toHaveLength(0);
  });

  test('should fail missing required options', () => {
    const options = {};
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

### 6. Mocking Requests

If your integration uses `PolarityRequest`, you can use the `mockRequest` helper.

```typescript
import { mockRequest } from 'polarity-integration-utils/testing';

// Must be called before importing the integration/PolarityRequest
const { PolarityRequestMock, mockRequest: requestMocks } = mockRequest();

import * as integration from '../src/integration';

describe('API Requests', () => {
  test('should make correct API call', async () => {
    requestMocks.get.mockResolvedValue({
      statusCode: 200,
      body: { data: 'test' }
    });

    const context = createMockIntegrationContext();
    await integration.doLookup([createEntity('IP', '1.1.1.1')], {}, context);

    expect(requestMocks.get).toHaveBeenCalledWith(
      expect.objectContaining({
        uri: expect.stringContaining('/api/endpoint')
      })
    );
  });
});
```

## Available Utilities

### `validateIntegration(integration, config)`

Runs strict validation on the integration object structure and configuration. Returns an object with `isValid` (boolean), `errors` (string array), and `warnings` (string array).

- `integration`: The exported integration object.
- `config`: The parsed `config.json` object.

### `createEntity(type, value)`

Creates a fully formed `Entity` object for testing.

- `type`: string (e.g., 'IP', 'domain', 'hash')
- `value`: string

### `createMockIntegrationContext()`

Creates a mock `IntegrationContext` object with mocked logger and cache.

- `context.logger`: Jest mocks for all log levels.
- `context.cache`: Jest mocks for `get`, `set`, `has`, `delete`.

### `mockRequest()`

Helper to mock `PolarityRequest` for testing HTTP calls.

## Best Practices

1.  **Use Async/Await**: v2 integrations rely on Promises. Avoid callbacks in tests.
2.  **Validate Structure**: Always ensure your integration passes `validateIntegration` including the `config.json`.
3.  **Test Edge Cases**: Use `createEntity` with various types and values.
4.  **Mock Context**: Always pass a mock context to `doLookup` to prevent runtime errors with logger/cache.
5.  **Clean Mocks**: Use `jest.clearAllMocks()` or `beforeEach` to reset mock state.
