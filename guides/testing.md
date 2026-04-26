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

## Mocking PolarityRequest

Integrations use `PolarityRequest` to make HTTP requests. In tests, you mock the `PolarityRequest` module so that calls to `request.run()` return controlled responses without hitting real APIs.

### Setting Up the Mock

Use `vi.hoisted()` to create the mock `run` function, then use `vi.mock()` to replace the `PolarityRequest` class with a mock that uses it:

```typescript
import { vi, describe, it, expect, beforeEach, beforeAll } from 'vitest';
import type {
  Entity,
  DoLookupUserOptions,
  IntegrationContext
} from '@polarityio/integration-types';
import type { HttpRequestResponse } from 'polarity-integration-utils';
import { createMockIntegrationContext } from 'polarity-integration-utils/testing';

// Hoist mock functions so they're available before vi.mock() runs
const { mockRun } = vi.hoisted(() => ({
  mockRun: vi.fn()
}));

vi.mock('polarity-integration-utils/requests', () => {
  return {
    PolarityRequest: vi.fn().mockImplementation(() => ({
      run: mockRun,
      runInParallel: vi.fn(),
      userOptions: null,
      limiter: null,
      hooks: { beforeRequest: [], afterResponse: [], onApiError: [], onNetworkError: [] }
    }))
  };
});

// Import your integration AFTER vi.mock() so it receives the mocked module
import { doLookup, startup } from '../src/integration';

// Shorthand for creating a mock context with Vitest spies
const createMockContext = () => createMockIntegrationContext(vi.fn);
```

### Helper Functions for Mock Responses

Create reusable helpers that configure `mockRun` to resolve or reject:

```typescript
function mockRunSuccess(body: unknown, statusCode = 200): void {
  mockRun.mockResolvedValue({
    statusCode,
    body
  } as HttpRequestResponse);
}

function mockRunError(error: Error): void {
  mockRun.mockRejectedValue(error);
}
```

### Writing Tests

```typescript
describe('doLookup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return results for a successful API response', async () => {
    mockRunSuccess({
      ip: '8.8.8.8',
      hostname: 'dns.google',
      org: 'Google LLC',
      country: 'US'
    });

    const entities: Entity[] = [createEntity('IPv4', '8.8.8.8')];
    const options: DoLookupUserOptions = { apiKey: 'test-key' };

    const results = await doLookup(entities, options, createMockContext());

    expect(results).toHaveLength(1);
    expect(results[0].data).not.toBeNull();
    expect(mockRun).toHaveBeenCalledTimes(1);
  });

  it('should handle empty results', async () => {
    mockRunSuccess({ ip: '8.8.8.8', bogon: true });

    const entities: Entity[] = [createEntity('IPv4', '8.8.8.8')];
    const options: DoLookupUserOptions = { apiKey: 'test-key' };

    const results = await doLookup(entities, options, createMockContext());

    expect(results[0].data).toBeNull();
  });

  it('should throw when the API returns an error', async () => {
    const { ApiRequestError } = await import('polarity-integration-utils');
    mockRunError(new ApiRequestError('Forbidden'));

    const entities: Entity[] = [createEntity('IPv4', '8.8.8.8')];
    const options: DoLookupUserOptions = { apiKey: 'invalid-key' };

    await expect(
      doLookup(entities, options, createMockContext())
    ).rejects.toThrow('Forbidden');
  });

  it('should throw on network errors', async () => {
    const { NetworkError } = await import('polarity-integration-utils');
    mockRunError(new NetworkError('ECONNREFUSED'));

    const entities: Entity[] = [createEntity('domain', 'unreachable.example.com')];
    const options: DoLookupUserOptions = { apiKey: 'test-key' };

    await expect(
      doLookup(entities, options, createMockContext())
    ).rejects.toThrow('ECONNREFUSED');
  });
});
```

### Verifying Request Options

You can inspect how your integration called `request.run()` to verify it builds the correct request:

```typescript
it('should pass the correct URL and headers', async () => {
  mockRunSuccess({ result: 'ok' });

  const entities: Entity[] = [createEntity('IPv4', '8.8.8.8')];
  const options: DoLookupUserOptions = { apiKey: 'my-key' };

  await doLookup(entities, options, createMockContext());

  expect(mockRun).toHaveBeenCalledWith(
    expect.objectContaining({
      url: expect.stringContaining('8.8.8.8'),
      headers: expect.objectContaining({
        Authorization: 'Bearer my-key'
      })
    })
  );
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

### `createMockIntegrationContext(createMockFn?)`

Creates a mock `IntegrationContext` with stubbed logger and cache methods. Pass your testing framework's mock function factory to enable spy capabilities (e.g., `toHaveBeenCalledWith()`).

```typescript
import { createMockIntegrationContext } from 'polarity-integration-utils/testing';

// With Vitest — enables assertions on mock calls
const context = createMockIntegrationContext(vi.fn);

// With Jest
const context = createMockIntegrationContext(jest.fn);

// Without a framework — uses plain no-op stubs
const context = createMockIntegrationContext();
```

The returned context includes:

- `context.logger` — stubbed logger (`trace`, `debug`, `info`, `warn`, `error`, `fatal`, `child`)
- `context.cache.global` / `integration` / `user` — stubbed `get`, `set`, `delete`
- `context.startPolling` / `stopPolling` — stubbed functions

When a mock factory is provided, `logger.child()` is automatically wired to return the logger for method chaining.

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

## Asserting on Cache Calls

The mock context created by `createMockIntegrationContext(vi.fn)` includes stubbed cache methods. You can assert that your integration reads from or writes to the cache:

```typescript
describe('cache operations', () => {
  it('should cache lookup results', async () => {
    mockRunSuccess({ ip: '8.8.8.8', org: 'Google LLC' });
    const context = createMockIntegrationContext(vi.fn);

    const entities: Entity[] = [createEntity('IPv4', '8.8.8.8')];
    const options: DoLookupUserOptions = { apiKey: 'test-key' };

    await doLookup(entities, options, context);

    expect(context.cache.integration.set).toHaveBeenCalledWith(
      '8.8.8.8',
      expect.objectContaining({ org: 'Google LLC' })
    );
  });

  it('should return cached data when available', async () => {
    const context = createMockIntegrationContext(vi.fn);
    const cached = { ip: '8.8.8.8', org: 'Google LLC' };

    (context.cache.integration.get as ReturnType<typeof vi.fn>)
      .mockResolvedValue(cached);

    const entities: Entity[] = [createEntity('IPv4', '8.8.8.8')];
    const options: DoLookupUserOptions = { apiKey: 'test-key' };

    await doLookup(entities, options, context);

    // Verify cache was checked and no HTTP request was made
    expect(context.cache.integration.get).toHaveBeenCalledWith('8.8.8.8');
    expect(mockRun).not.toHaveBeenCalled();
  });
});
```

## Best Practices

1. **Mock at the `PolarityRequest` level** — Mock `request.run()` rather than the underlying HTTP library. This keeps tests decoupled from internal implementation details.
2. **Clear mocks between tests** — Use `vi.clearAllMocks()` in `beforeEach` to prevent state leaking between tests.
3. **Test edge cases** — Empty responses, API errors, network errors, rate limits, and invalid input.
4. **Use `vi.hoisted()`** — When using `vi.mock()`, any mock functions referenced inside the factory must be hoisted so they exist before the mock is applied.
5. **Import after mocking** — Always import your integration module _after_ `vi.mock()` calls so it receives the mocked dependencies.
6. **Verify request options** — Use `expect(mockRun).toHaveBeenCalledWith(expect.objectContaining(...))` to assert your integration builds the correct request URL, headers, and body.
