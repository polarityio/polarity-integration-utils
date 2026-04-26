---
title: Polarity Request
group: Documents
category: Guides
---

The Polarity Integration Utils library provides a set of utilities to help you build integrations quickly and efficiently for Polarity.  The core of the library is the {@link PolarityRequest} class which provides a simple interface for making HTTP requests and handling responses.

# Setup

To start, import the `PolarityRequest` class at the top of your integration file.

```typescript
import { PolarityRequest } from 'polarity-integration-utils';
```

Typically, you will want to create a single instance of the `PolarityRequest` class and use that instance for all of your requests.  You can do this by creating a new instance in the `startup` method of your integration.

```typescript
import type { Logger } from '@polarityio/integration-types';
import { setLogger } from 'polarity-integration-utils';

let request: PolarityRequest;

function startup(logger: Logger): void {
  setLogger(logger);
  request = new PolarityRequest();
}
```

You now have access to the `request` object throughout your integration file.

Note the use of {@link setLogger} here from the logging utilities module.  Setting the logger within your `startup` method is important as it will ensure that all logging from the `PolarityRequest` class is properly logged to the integration's log file.

Within your `doLookup` method you will want to set the `userOptions` property on the `request` instance.  This will ensure that the `userOptions` are passed along with each request.  This step should be done before any requests are made.  

```typescript
import type { Entity, DoLookupUserOptions, DoLookupCallback } from '@polarityio/integration-types';

async function doLookup(entities: Entity[], options: DoLookupUserOptions, cb: DoLookupCallback): Promise<void> {
  request.userOptions = options;
}
```

From here you can use either the {@link PolarityRequest.run} or {@link PolarityRequest.runInParallel} methods to make your requests.

If you forget to set `userOptions` calls to {@link PolarityRequest.run} or {@link PolarityRequest.runInParallel} will throw a {@link LibraryUsageError}.

Now that we have the PolarityRequest object created and configured, we'll show an example using the `run` method.  

# Run a single HTTP request

The {@link PolarityRequest.run} method runs a single HTTP request based on the provided {@link HttpRequestOptions} object.  The `run` method will return a promise that will resolve to the response from the HTTP request.

As an example, to make a request to the GitHub API you could do the following:

```typescript
const response = await request.run({
  url: 'https://api.github.com/users/octocat'
});
```

The `response` is a {@link HttpRequestResponse} object which contains a `body` property that has the response body.  By default, the PolarityRequest class will attempt to parse the response body as JSON. In cases where
the response body is not JSON, you can set the `json` property on the `HttpRequestOptions` object to `false`.

The HTTP request is considered successful if any 2xx status code is returned.  In the event a non-2xx status code is returned, the `run` method will throw an {@link ApiRequestError} that you should catch and handle appropriately.  
In the event of a network error (e.g., DNS lookup failure, connection timeout, etc.), the `run` method will throw a {@link NetworkError}.

```typescript
import { ApiRequestError, NetworkError } from 'polarity-integration-utils';

try {
  const response = await request.run({
    url: 'https://api.github.com/users/octocat'
  });
} catch (error) {
  if (error instanceof ApiRequestError) {
    // handle API request error
  } else if (error instanceof NetworkError) {
    // handle network errors
  } else {
    // handle other errors
  }
}
```

# Running Multiple Requests in Parallel

A common requirement is to run multiple requests in parallel.  This can be done with the {@link PolarityRequest.runInParallel} method which takes an options object containing an array of {@link HttpRequestOptions}.  Additionally, you can specify how many requests to run in parallel (defaults to 5), and whether to return errors as part of the return payload or throw an error if any of the requests fail (the default behavior).

The `runInParallel` method will return an array of {@link HttpRequestResponse} objects. The results array preserves the same order as the input `allRequestOptions` array, so `results[i]` corresponds to `allRequestOptions[i]`.

> **Note:** If you have `onNetworkError` hooks configured and a hook suppresses an error (returns without throwing), the corresponding entry in the results array will be `undefined`. This only applies when `onNetworkError` hooks are present. If you don't use `onNetworkError` hooks, every entry in the results array is guaranteed to be an `HttpRequestResponse`.

A typical pattern for running multiple requests in parallel is to create an array of requests and then passing those into the `runInParallel` method.

```typescript
import type { HttpRequestOptions } from 'polarity-integration-utils';

const users: string[] = ['octocat', 'polarityio', 'threatconnect-inc'];

const requests: HttpRequestOptions[] = users.map((user) => ({
  url: `https://api.github.com/users/${user}`
}));

try {
  const responses = await request.runInParallel({
    allRequestOptions: requests
  });

  for (const response of responses) {
    const body = response.body;
    // Process response as needed
  }
} catch (error) {
  if (error instanceof ApiRequestError) {
    // handle API request error
  } else if (error instanceof NetworkError) {
    // handle network errors
  } else {
    // handle other errors
  }
}
```


# Modifying Request Behavior

## Request Defaults

The `defaults` option configures the underlying HTTP client with default settings for TLS certificates, proxy configuration, and response parsing. These are applied to every request made by the instance:

```typescript
const request = new PolarityRequest({
  defaults: {
    // TLS/SSL certificate options (file paths read at construction time)
    ca: '/path/to/ca-bundle.pem',
    cert: '/path/to/client-cert.pem',
    key: '/path/to/client-key.pem',
    passphrase: 'cert-passphrase',

    // Proxy and TLS settings
    proxy: 'http://proxy.example.com:8080',
    rejectUnauthorized: true, // default: true

    // Automatically parse JSON responses (default: true)
    json: true
  }
});
```

Default values for proxy and TLS certificates are provided by the Polarity server and do not typically need to be manually set. The server passes these through based on the platform's configuration.

## Modify Success HTTP Status Codes

By default, the PolarityRequest class will consider any 2xx status code as a successful response.  You can modify this behavior by setting the `successStatusCodes` property when creating the `PolarityRequest` instance.

For example, if you also wanted to treat 400 responses as successful (i.e., not throw an {@link ApiRequestError}), you could do the following:

```typescript
const request = new PolarityRequest({
  // Treat 2xx and 4xx status codes as "successful" (i.e., do not throw an ApiRequestError)
  roundedSuccessStatusCodes: [200, 400]
});
```

## Modify Error Properties

Some APIs always return a 200 HTTP Status Code and represent a failure in the response body.  In these cases, you can use the `httpResponseErrorProperties` property to specify the properties that should be considered an error.  You can use JSON dot notation when specifying the path. If any of the specified properties are present in the response body, the `run` method will throw an {@link ApiRequestError}.  For example, if an API returns an HttpStatus of 200 with an error response like this:

```json
{
  "result": {
    "error": {
      "code": 400,
      "message": "Bad Request"
    }    
  }
}
```

You could configure the `PolarityRequest` instance to throw an error if the `result.error.code` property is present in the response body like this:

```typescript
const request = new PolarityRequest({
  httpResponseErrorProperties: ['result.error.code']
});
```

If more than one property is specified, the `run` method will throw an error if any of the specified properties are present in the response body.

## Modify Error Messages

By default, the `PolarityRequest` class will throw an {@link ApiRequestError} with a message that includes the HTTP status code and response body.  You can modify the error message by setting the `httpResponseErrorMessageProperties` property with a JSON path when creating the `PolarityRequest` instance.  If the provided path is a `string` value, that `string` value will be used as the error message.

For example, if the response payload is like this:

```json
{
  "result": {
    "error": {
      "code": 400,
      "message": "This is a useful error message"
    }    
  }
} 
```

You can configure the `PolarityRequest` instance to throw an error with the message "This is a useful error message" like this:

```typescript
const request = new PolarityRequest({
  httpResponseErrorMessageProperties: ['result.error.message']
});
```

When an error is encountered, the PolarityRequest instance will look for an error message in the response body using the specified path.  If the path is not found, or the value at the path is not a string, the default error message will be used.  If more than one path is provided, the first path that contains a string will be used. 

## Sanitize Sensitive Request Options

When errors are thrown by `PolarityRequest`, the request options are included in the error for debugging. By default, common sensitive fields are automatically redacted:

- `auth.password`
- `auth.bearer`
- `body.password`
- `form.client_secret`
- `headers.authorization` (case-insensitive)
- `headers.x-api-key` (case-insensitive)

If your integration sends additional sensitive data in request options, you can specify extra paths to sanitize using `requestOptionsToSanitize`. Paths use dot notation:

```typescript
const request = new PolarityRequest({
  requestOptionsToSanitize: ['headers.x-custom-token', 'body.apiSecret']
});
```

These paths are sanitized in addition to the defaults — you do not need to re-specify the built-in paths.

## Customize Error Detection

If you need full control over error detection you can implement the `isApiError` option on the `PolarityRequest` instance.  The `isApiError` function receives the full HTTP response, request options, and user options.  It should return an object with an `isApiError` boolean and an optional `message` string.

When `isApiError` is provided, the `roundedSuccessStatusCodes` and `httpResponseErrorProperties` options are not used for error detection.  If `isApiError` returns `{ isApiError: true }` without a `message`, the `httpResponseErrorMessageProperties` and `httpResponseErrorProperties` options may still be used to derive a default error message.

```typescript
import type { HttpRequestResponse, HttpRequestOptions, IsApiErrorResult } from 'polarity-integration-utils';
import type { DoLookupUserOptions } from '@polarityio/integration-types';

function checkForApiError(
  httpResponse: HttpRequestResponse,
  requestOptions: HttpRequestOptions,
  userOptions: DoLookupUserOptions
): IsApiErrorResult {
  if (httpResponse.body?.status === 'error') {
    return { isApiError: true, message: httpResponse.body.message };
  }
  return { isApiError: false };
}

const request = new PolarityRequest({
  isApiError: checkForApiError
});
```

## Hooks

The `PolarityRequest` class supports lifecycle hooks that allow you to customize request and response behavior. Hooks are passed via the `hooks` option when creating a `PolarityRequest` instance.

There are four hook types:

- **`beforeRequest`** — Runs before each HTTP request. Receives the request options and user options. Returns modified request options. Multiple hooks chain in order.
- **`afterResponse`** — Runs after a successful HTTP response. Receives the response, request options, and user options. Returns the modified response. Multiple hooks chain in order.
- **`onApiError`** — Runs when an API error is detected (non-success status code or response body error properties). Receives the error, the full HTTP response, request options, and user options. If all hooks return without throwing, the error is suppressed.
- **`onNetworkError`** — Runs when a network or rate-limiting error occurs. If all hooks return without throwing, the error is suppressed and `run()` returns `undefined`.

## Adding Authentication with `beforeRequest`

```typescript
import type { BeforeRequestHook } from 'polarity-integration-utils';

const addAuthentication: BeforeRequestHook= async (requestOptions, userOptions) => {
  return {
    ...requestOptions,
    headers: {
      ...requestOptions.headers,
      Authorization: `Bearer ${userOptions.apiKey}`
    }
  };
};

const request = new PolarityRequest({
  hooks: {
    beforeRequest: [addAuthentication]
  }
});
```

## Extracting Response Data with `afterResponse`

```typescript
import type { AfterResponseHook } from 'polarity-integration-utils';

const extractData: AfterResponseHook = async (response, requestOptions, userOptions) => {
  return {
    ...response,
    body: response.body?.data
  };
};

const request = new PolarityRequest({
  hooks: {
    afterResponse: [extractData]
  }
});
```

## Handling API Errors with `onApiError`

The `onApiError` hook gives you access to both the error and the original HTTP response, making it easy to inspect status codes, headers, and the response body.

```typescript
import type { OnApiErrorHook } from 'polarity-integration-utils';

const suppressNotFound: OnApiErrorHook = async (error, response, requestOptions, userOptions) => {
  if (response.statusCode === 404) {
    // Suppress 404 errors — they're expected for missing resources
    return;
  }
  // Re-throw all other errors
  throw error;
};

const request = new PolarityRequest({
  hooks: {
    onApiError: [suppressNotFound]
  }
});
```

## Handling Network Errors with `onNetworkError`

```typescript
import type { OnNetworkErrorHook } from 'polarity-integration-utils';

const logNetworkError: OnNetworkErrorHook = async (error, requestOptions, userOptions) => {
  logger.error({ err: error }, 'Network error occurred');
  // Re-throw so the caller knows about the failure
  throw error;
};

const request = new PolarityRequest({
  hooks: {
    onNetworkError: [logNetworkError]
  }
});
```

## Chaining Multiple Hooks

Hooks execute in array order. For `beforeRequest` and `afterResponse`, each hook receives the output of the previous hook:

```typescript
import type { BeforeRequestHook } from 'polarity-integration-utils';

const addAuth: BeforeRequestHook = async (requestOptions, userOptions) => {
  return {
    ...requestOptions,
    headers: { ...requestOptions.headers, Authorization: `Bearer ${userOptions.apiKey}` }
  };
};

const addTrackingHeader: BeforeRequestHook = async (requestOptions, userOptions) => {
  return {
    ...requestOptions,
    headers: { ...requestOptions.headers, 'X-Request-Source': 'polarity' }
  };
};

const request = new PolarityRequest({
  hooks: {
    beforeRequest: [addAuth, addTrackingHeader]
  }
});
```

## Rate Limiting

The Polarity server provides a rate limiter instance to your integration via the context object. You can pass this limiter to `PolarityRequest` to throttle outgoing HTTP requests. The limiter must satisfy the `Limiter` interface exported by this library:

```typescript
import { PolarityRequest, type Limiter } from 'polarity-integration-utils';

// The limiter is providedby the Polarity server via the integration context
const limiter: Limiter = context.limiter;

const request = new PolarityRequest({ limiter });
```

You can also set the limiter as a mutable property after construction:

```typescript
const request = new PolarityRequest();

// Set the limiter later when it becomes available
request.limiter = context.limiter;
```

When a limiter is set, all HTTP requests made via `run()` are scheduled through `limiter.schedule()`. If the limiter rejects a request (e.g., due to a `highWater` limit), a `RetryRequestError` is thrown.

### Handling `RetryRequestError`

By default, a `RetryRequestError` propagates up to the caller as an unhandled error. You can catch it in your integration to handle the rate limit gracefully — for example, returning results with a flag instead of failing:

```typescript
import { PolarityRequest, RetryRequestError, type Limiter } from 'polarity-integration-utils';
import type { LookupResult } from '@polarityio/integration-types';

const limiter: Limiter = context.limiter;
const request = new PolarityRequest({ limiter });

async function doLookup(entity: Entity): Promise<LookupResult> {
  try {
    const response = await request.run({
      url: `https://api.example.com/lookup?q=${entity.value}`
    });

    return {
      entity,
      data: {
        summary: [response.body.title],
        details: response.body
      }
    };
  } catch (error) {
    if (error instanceof RetryRequestError) {
      return {
        entity,
        data: {
          summary: ['API Limit Reached'],
          details: { apiLimitReached: true }
        }
      };
    }
    throw error;
  }
}
```

Alternatively, you can use the `onNetworkError` hook to suppress rate limit errors so that `run()` returns `undefined` instead of throwing. **Note:** Suppressing rate limit errors is not generally recommended as it silently drops requests that could otherwise be retried. Use this pattern only when your integration needs to return partial results rather than fail entirely:

```typescript
import { PolarityRequest, RetryRequestError, type OnNetworkErrorHook } from 'polarity-integration-utils';

const suppressRateLimitError: OnNetworkErrorHook = async (error) => {
  if (error instanceof RetryRequestError) {
    logger.warn('Rate limit reached, suppressing error');
    return;
  }
  throw error;
};

const request = new PolarityRequest({
  limiter: context.limiter,
  hooks: {
    onNetworkError: [suppressRateLimitError]
  }
});

const response = await request.run({ url: 'https://api.example.com/data' });

if (!response) {
  // Rate limit was hit — run() returned undefined because the hook suppressed the error
  return { entity, data: { summary: ['API Limit Reached'], details: { apiLimitReached: true } } };
}
```