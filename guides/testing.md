---
title: Testing
group: Documents
category: Guides
---

# Integration Testing Guide

This guide shows integration developers how to write tests for Polarity integrations using [Vitest](https://vitest.dev/) and the test helpers from `polarity-integration-utils/testing`.

## Quick Setup

1.  **Install testing dependencies:**

    ```bash
    npm install --save-dev vitest
    ```

2.  **Add a Vitest config** (`vitest.config.ts`):

    ```typescript
    import { defineConfig } from 'vitest/config';

    export default defineConfig({
      test: {
        environment: 'node',
        include: ['test/**/*.test.ts']
      }
    });
    ```

3.  **Add a test script** to `package.json`:

    ```json
    {
      "scripts": {
        "test": "vitest run",
        "test:watch": "vitest"
      }
    }
    ```

4.  **Run tests:**

    ```bash
    npm test
    ```

## Mocking HTTP Endpoints

Most integrations make HTTP requests via `postman-request`. The most common testing pattern is mocking this module so tests run without hitting real APIs.

### Setting Up the Mock

Use `vi.hoisted()` to create mock functions that are available before `vi.mock()` rewires imports:

```typescript
import { vi, describe, it, expect, beforeEach, beforeAll } from 'vitest';
import type { Entity, DoLookupUserOptions, IntegrationContext } from '@polarityio/integration-types';

// Hoist the mock function so it's available before vi.mock() runs
const { mockRequest } = vi.hoisted(() => ({
  mockRequest: vi.fn()
}));

vi.mock('postman-request', () => {
  return { default: mockRequest };
});

// Import your integration AFTER vi.mock() so it receives the mocked module
import { doLookup, startup } from '../src/integration';
```

### Helper Functions for Mock Responses

Create reusable helpers for simulating successful and failed HTTP responses:

```typescript
function mockRequestSuccess(body: Record<string, unknown>, statusCode = 200): void {
  mockRequest.mockImplementation(
    (_opts: unknown, cb: (err: null, res: { statusCode: number; body: unknown }) => void) => {
      cb(null, { statusCode, body });
    }
  );
}

function mockRequestError(message: string): void {
  mockRequest.mockImplementation((_opts: unknown, cb: (err: Error) => void) => {
    cb(new Error(message));
  });
}
```

### Writing Tests with Mocked Endpoints

```typescript
describe('doLookup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return results for a successful API response', async () => {
    mockRequestSuccess({
      ip: '8.8.8.8',
      hostname: 'dns.google',
      org: 'Google LLC',
      country: 'US'
    });

    const entities: Entity[] = [createMockEntity()];
    const options: DoLookupUserOptions = { apiKey: 'test-key' };

    const results = await doLookup(entities, options, createMockContext());

    expect(results).toHaveLength(1);
    expect(results[0].data).not.toBeNull();
    expect(mockRequest).toHaveBeenCalledTimes(1);
  });

  it('should throw on network errors', async () => {
    mockRequestError('ECONNREFUSED');

    const entities: Entity[] = [createMockEntity()];
    const options: DoLookupUserOptions = { apiKey: 'test-key' };

    await expect(
      doLookup(entities, options, createMockContext())
    ).rejects.toBeDefined();
  });

  it('should throw on non-success status codes', async () => {
    mockRequestSuccess(
      { error: { title: 'Forbidden', message: 'Invalid token' } },
      403
    );

    const entities: Entity[] = [createMockEntity()];
    const options: DoLookupUserOptions = { apiKey: 'test-key' };

    await expect(
      doLookup(entities, options, createMockContext())
    ).rejects.toBeDefined();
  });
});
```

## Test Helpers

### `createEntity(type, value)`

Creates a fully formed `Entity` object for testing.

```typescript
import { createEntity } from 'polarity-integration-utils/testing';

const ipEntity = createEntity('IPv4', '8.8.8.8');
const domainEntity = createEntity('domain', 'example.com');
const hashEntity = createEntity('MD5', 'd41d8cd98f00b204e9800998ecf8427e');
```

- `type`: An `EntityType` string (e.g., `'IPv4'`, `'IPv6'`, `'domain'`, `'MD5'`, `'SHA256'`)
- `value`: The entity value string

### `createMockIntegrationContext()`

Creates a mock `IntegrationContext` with stubbed logger and cache methods.

```typescript
import { createMockIntegrationContext } from 'polarity-integration-utils/testing';

const context = createMockIntegrationContext();

// context.logger — stubbed logger (trace, debug, info, warn, error, fatal)
// context.cache.global — stubbed get, set, delete
// context.cache.integration — stubbed get, set, delete
// context.cache.user — stubbed get, set, delete
```

> **Note:** `createMockIntegrationContext` uses `jest.fn()` internally for stubs. If your project uses Vitest, you may prefer creating your own mock context using `vi.fn()` as shown below.

### Creating a Vitest-Native Mock Context

```typescript
import { vi } from 'vitest';
import type { IntegrationContext, Logger } from '@polarityio/integration-types';

function createMockLogger(): Logger {
  const logger: Record<string, unknown> = {
    trace: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    fatal: vi.fn(),
    child: vi.fn()
  };
  (logger.child as ReturnType<typeof vi.fn>).mockReturnValue(logger);
  return logger as unknown as Logger;
}

function createMockContext(): IntegrationContext {
  return {
    logger: createMockLogger(),
    cache: {
      global: { get: vi.fn(), set: vi.fn(), delete: vi.fn() },
      integration: { get: vi.fn(), set: vi.fn(), delete: vi.fn() },
      user: { get: vi.fn(), set: vi.fn(), delete: vi.fn() }
    },
    integrationId: 'test-integration',
    userId: 1,
    startPolling: vi.fn(),
    stopPolling: vi.fn()
  } as unknown as IntegrationContext;
}
```

## Testing `validateOptions`

```typescript
import type { ValidateOptionsUserOptions } from '@polarityio/integration-types';

describe('validateOptions', () => {
  it('should pass with valid options', () => {
    const options: ValidateOptionsUserOptions = {
      apiKey: {
        key: 'apiKey',
        value: 'valid-key',
        integration_id: 'test-integration',
        user_can_edit: true,
        admin_only: false
      }
    };
    const errors = validateOptions(options, createMockContext());
    expect(errors).toHaveLength(0);
  });

  it('should return errors for missing required options', () => {
    const options: ValidateOptionsUserOptions = {
      apiKey: {
        key: 'apiKey',
        value: '',
        integration_id: 'test-integration',
        user_can_edit: true,
        admin_only: false
      }
    };
    const errors = validateOptions(options, createMockContext());
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].key).toBe('apiKey');
  });
});
```

## Mocking Cache

You can provide mock implementations for cache methods to simulate caching behavior:

```typescript
describe('cache operations', () => {
  it('should cache lookup results', async () => {
    mockRequestSuccess({ ip: '8.8.8.8', org: 'Google LLC' });
    const context = createMockContext();
    const cacheStore = new Map<string, unknown>();

    (context.cache.integration.get as ReturnType<typeof vi.fn>)
      .mockImplementation((key: string) => cacheStore.get(key));
    (context.cache.integration.set as ReturnType<typeof vi.fn>)
      .mockImplementation((key: string, value: unknown) => cacheStore.set(key, value));

    const entities: Entity[] = [createMockEntity()];
    const options: DoLookupUserOptions = { apiKey: 'test-key' };

    await doLookup(entities, options, context);

    expect(context.cache.integration.set).toHaveBeenCalled();
  });
});
```

## Best Practices

1. **Clear mocks between tests** — Use `vi.clearAllMocks()` in `beforeEach` to prevent state leaking between tests.
2. **Mock at the module boundary** — Mock `postman-request` (or whatever HTTP client your integration uses) rather than internal functions.
3. **Test edge cases** — Empty responses, error status codes, network failures, rate limits, and invalid input.
4. **Use `vi.hoisted()`** — When using `vi.mock()`, any mock functions referenced inside the factory must be hoisted so they exist before the mock is applied.
5. **Import after mocking** — Always import your integration module _after_ `vi.mock()` calls so it receives the mocked dependencies.
