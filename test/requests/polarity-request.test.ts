import { setLogger } from '../../lib/logging/logger';
import { identity } from 'lodash/fp';
import {
  HttpRequestOptions,
  HttpRequestResponse,
  PolarityRequest,
  BeforeRequestHook,
  AfterResponseHook,
  Limiter
} from '../../lib/requests/polarity-request';
import postmanRequest from 'postman-request';
import { sanitizeRequestOptions } from '../../lib/requests/sanitize-request-options';
import {
  ApiRequestError,
  LibraryUsageError,
  NetworkError,
  RetryRequestError
} from '../../lib/errors';
import type { Entity } from '@polarityio/integration-types';

type PostmanRequestCallback = (
  error: Error | null,
  result?: unknown,
  body?: unknown
) => void;

const identityLogger = {
  child: () => identityLogger,
  trace: identity,
  info: identity,
  error: identity,
  debug: identity,
  fatal: identity,
  warn: identity
};

beforeAll(() => {
  setLogger(identityLogger);
});

jest.mock('postman-request');

jest.mock('fs', () => ({
  readFileSync: jest.fn().mockImplementation((x) => x)
}));

function createMockLimiter(): Limiter {
  return {
    schedule: jest.fn(
      async <T>(fn: (...args: unknown[]) => PromiseLike<T>, ...args: unknown[]) =>
        fn(...args)
    )
  };
}

class BottleneckError extends Error {
  constructor(message: string) {
    super(message);
  }
}

const entity: Entity = {
  value: '8.8.8.8',
  rawValue: '8.8.8.8',
  types: ['IP', 'IPv4'],
  type: 'IPv4',
  requestContext: { requestType: 'OnDemand', isUserInitiated: true },
  longitude: 0,
  latitude: 0,
  IPLong: 0,
  isURL: false,
  isSHA512: false,
  isSHA256: false,
  isSHA1: false,
  isPrivateIP: false,
  isMD5: false,
  isIPv6: false,
  isIPv4: true,
  isIP: true,
  isHex: false,
  isHash: false,
  isHTMLTag: false,
  isEmail: false,
  isDomain: false,
  hashType: '',
  displayValue: '8.8.8.8',
  channels: [],
  IPType: 'IPv4'
};

const entityDomain: Entity = {
  value: 'google.com',
  rawValue: 'google.com',
  types: ['domain'],
  type: 'domain',
  requestContext: { requestType: 'OnDemand', isUserInitiated: true },
  longitude: 0,
  latitude: 0,
  IPLong: 0,
  isURL: false,
  isSHA512: false,
  isSHA256: false,
  isSHA1: false,
  isPrivateIP: false,
  isMD5: false,
  isIPv6: false,
  isIPv4: false,
  isIP: false,
  isHex: false,
  isHash: false,
  isHTMLTag: false,
  isEmail: false,
  isDomain: true,
  hashType: '',
  displayValue: 'google.com',
  channels: [],
  IPType: ''
};

describe('PolarityRequest', () => {
  // Default mock implementation for postmanRequest.defaults
  beforeEach(() => {
    postmanRequest.defaults.mockImplementation(
      () => (requestOptions: HttpRequestOptions, cb: PostmanRequestCallback) => {
        const body = { message: 'Request Ran' };
        const response = { statusCode: 200, body };
        cb(null, response, body);
      }
    );
  });

  describe('Constructor', () => {
    it('should create a PolarityRequest object with default values', () => {
      expect.assertions(9);

      const defaultRequestOptions = {
        rejectUnauthorized: true,
        json: true
      };

      const request = new PolarityRequest();

      expect(postmanRequest.defaults).toHaveBeenCalledWith(
        expect.objectContaining(defaultRequestOptions)
      );
      expect(request.requestOptionsToSanitize).toEqual([]);
      expect(request.roundedSuccessStatusCodes).toEqual([200]);
      expect(request.httpResponseErrorProperties).toEqual([]);
      expect(request.httpResponseErrorMessageProperties).toEqual([]);
      expect(request.isApiError).toEqual(null);
      expect(request.userOptions).toEqual(null);
      expect(request.limiter).toEqual(null);
      expect(request.hooks).toEqual({
        beforeRequest: [],
        afterResponse: [],
        onApiError: [],
        onNetworkError: []
      });
    });

    it('should create a PolarityRequest object with `roundedSuccessStatusCodes` set', () => {
      expect.assertions(1);
      const roundedSuccessStatusCodes = [200, 400];
      const request = new PolarityRequest({
        roundedSuccessStatusCodes
      });
      expect(request.roundedSuccessStatusCodes).toEqual([200, 400]);
    });

    it('should create a PolarityRequest object with `requestOptionsToSanitize` set', () => {
      expect.assertions(1);
      const requestOptionsToSanitize = ['headers.auth'];
      const request = new PolarityRequest({
        requestOptionsToSanitize
      });
      expect(request.requestOptionsToSanitize).toEqual(['headers.auth']);
    });

    it('should create a PolarityRequest object with `httpResponseErrorProperties` set', () => {
      expect.assertions(1);
      const httpResponseErrorProperties = ['error.code'];
      const request = new PolarityRequest({
        httpResponseErrorProperties
      });
      expect(request.httpResponseErrorProperties).toEqual(['error.code']);
    });

    it('should create a PolarityRequest object with `httpResponseErrorMessageProperties` set', () => {
      expect.assertions(1);
      const httpResponseErrorMessageProperties = ['error.message'];
      const request = new PolarityRequest({
        httpResponseErrorMessageProperties
      });
      expect(request.httpResponseErrorMessageProperties).toEqual(['error.message']);
    });

    it('should create a PolarityRequest object with `isApiError` set', () => {
      expect.assertions(1);
      const isApiError = jest.fn();
      const request = new PolarityRequest({
        isApiError
      });
      expect(request.isApiError).toEqual(isApiError);
    });

    it('should create a PolarityRequest object and set `userOptions` afterwards', () => {
      expect.assertions(1);
      const userOptions = { customOption: true };
      const request = new PolarityRequest();
      request.userOptions = userOptions;
      expect(request.userOptions).toEqual(userOptions);
    });

    it('should create a PolarityRequest object with `limiter` set via constructor', () => {
      expect.assertions(1);
      const limiter = createMockLimiter();
      const request = new PolarityRequest({ limiter });
      expect(request.limiter).toBe(limiter);
    });

    it('should create a PolarityRequest object with `hooks` set via constructor', () => {
      expect.assertions(4);
      const beforeRequest = [jest.fn()];
      const afterResponse = [jest.fn()];
      const onApiError = [jest.fn()];
      const onNetworkError = [jest.fn()];
      const request = new PolarityRequest({
        hooks: { beforeRequest, afterResponse, onApiError, onNetworkError }
      });
      expect(request.hooks.beforeRequest).toEqual(beforeRequest);
      expect(request.hooks.afterResponse).toEqual(afterResponse);
      expect(request.hooks.onApiError).toEqual(onApiError);
      expect(request.hooks.onNetworkError).toEqual(onNetworkError);
    });

    it('should create a PolarityRequest object with partial `hooks` set via constructor', () => {
      expect.assertions(4);
      const beforeRequest = [jest.fn()];
      const request = new PolarityRequest({
        hooks: { beforeRequest }
      });
      expect(request.hooks.beforeRequest).toEqual(beforeRequest);
      expect(request.hooks.afterResponse).toEqual([]);
      expect(request.hooks.onApiError).toEqual([]);
      expect(request.hooks.onNetworkError).toEqual([]);
    });

    it('should create a PolarityRequest object custom `defaults` options value set', () => {
      expect.assertions(1);
      const defaultRequestOptions = {
        ca: 'a',
        cert: 'b',
        key: 'c',
        passphrase: 'd',
        proxy: 'e',
        rejectUnauthorized: false,
        json: false
      };
      new PolarityRequest({
        defaults: defaultRequestOptions
      });
      expect(postmanRequest.defaults).toHaveBeenCalledWith(
        expect.objectContaining(defaultRequestOptions)
      );
    });
  });

  describe('run()', () => {
    it('should throw LibraryUsageError if `userOptions` is not set before `run` call', async () => {
      expect.assertions(1);
      const request = new PolarityRequest();
      const requestOptions = { url: 'http://example.com' };
      try {
        await request.run(requestOptions);
      } catch (error) {
        expect(error instanceof LibraryUsageError).toBeTruthy();
      }
    });

    it('should call `beforeRequest` hooks with the correct userOptions and requestOptions', async () => {
      expect.assertions(2);
      const userOptionsExternal = { customOption: true };
      const requestOptionsExternal = { url: 'http://example.com' };

      const beforeRequest: BeforeRequestHook = async (
        requestOptions,
        userOptions
      ) => {
        expect(userOptions).toEqual(userOptionsExternal);
        expect(requestOptions).toEqual(requestOptionsExternal);
        return requestOptions;
      };

      const request = new PolarityRequest({
        hooks: { beforeRequest: [beforeRequest] }
      });
      request.userOptions = userOptionsExternal;

      await request.run(requestOptionsExternal);
    });

    it('should call `afterResponse` hooks with the correct httpResponse, requestOptions, and userOptions', async () => {
      expect.assertions(3);
      const body = { message: 'Request Ran' };
      const response = {
        statusCode: 200,
        body
      };

      postmanRequest.defaults.mockImplementation(
        () => (requestOptions: HttpRequestOptions, cb: PostmanRequestCallback) => {
          cb(null, response, body);
        }
      );

      const userOptionsExternal = { customOption: true };
      const requestOptionsExternal = { url: 'http://example.com' };

      const afterResponse: AfterResponseHook = async (
        hookResponse,
        requestOptions,
        userOptions
      ) => {
        expect(hookResponse).toEqual(response);
        expect(userOptions).toEqual(userOptionsExternal);
        expect(requestOptions).toEqual(requestOptionsExternal);
        return hookResponse;
      };

      const request = new PolarityRequest({
        hooks: { afterResponse: [afterResponse] }
      });
      request.userOptions = userOptionsExternal;

      await request.run(requestOptionsExternal);
    });

    it('should call `onNetworkError` hooks with the correct error, requestOptions, and userOptions', async () => {
      expect.assertions(3);

      const networkError = new Error('Network Error');
      postmanRequest.defaults.mockImplementation(
        () => (requestOptions: HttpRequestOptions, cb: PostmanRequestCallback) => {
          cb(networkError);
        }
      );

      const userOptionsExternal = { customOption: true };
      const requestOptionsExternal = { url: 'http://example.com' };

      const onNetworkError = async (error, requestOptions, userOptions) => {
        expect(error instanceof NetworkError).toBeTruthy();
        expect(requestOptions).toEqual(requestOptionsExternal);
        expect(userOptions).toEqual(userOptionsExternal);
      };

      const request = new PolarityRequest({
        hooks: { onNetworkError: [onNetworkError] }
      });
      request.userOptions = userOptionsExternal;

      await request.run(requestOptionsExternal);
    });

    it('should return the response from a successful API request', async () => {
      expect.assertions(1);
      const body = { message: 'Request Ran' };
      const response = {
        statusCode: 200,
        body
      };

      postmanRequest.defaults.mockImplementation(
        () => (requestOptions: HttpRequestOptions, cb: PostmanRequestCallback) => {
          cb(null, response, body);
        }
      );

      const request = new PolarityRequest();
      const userOptionsExternal = { customOption: true };
      const requestOptionsExternal = { url: 'http://example.com' };

      request.userOptions = userOptionsExternal;

      const result = await request.run(requestOptionsExternal);
      expect(result).toEqual(response);
    });

    it('should throw an ApiRequestError from an unsuccessful API request statusCode', async () => {
      expect.assertions(1);
      const body = { message: 'Request Failed' };
      const response = {
        statusCode: 400,
        body
      };

      postmanRequest.defaults.mockImplementation(
        () => (requestOptions: HttpRequestOptions, cb: PostmanRequestCallback) => {
          cb(null, response, body);
        }
      );

      const request = new PolarityRequest();
      const userOptionsExternal = { customOption: true };
      const requestOptionsExternal = { url: 'http://example.com' };

      request.userOptions = userOptionsExternal;

      try {
        await request.run(requestOptionsExternal);
      } catch (error) {
        expect(error instanceof ApiRequestError).toBeTruthy();
      }
    });

    it('should throw an ApiRequestError and sanitize default sensitive header in requestOptions', async () => {
      expect.assertions(2);
      const body = { message: 'Request Failed' };
      const response = {
        statusCode: 400,
        body
      };

      postmanRequest.defaults.mockImplementation(
        () => (requestOptions: HttpRequestOptions, cb: PostmanRequestCallback) => {
          cb(null, response, body);
        }
      );

      const request = new PolarityRequest();
      const userOptionsExternal = { customOption: true };
      const requestOptionsExternal = {
        url: 'http://example.com',
        headers: {
          authorization: 'Basic abc123'
        }
      };

      request.userOptions = userOptionsExternal;

      try {
        await request.run(requestOptionsExternal);
      } catch (error) {
        expect(error instanceof ApiRequestError).toBeTruthy();
        expect(error.requestOptions.headers.authorization).toEqual('**********');
      }
    });

    it('should throw an ApiRequestError and sanitize custom paths via the `requestOptionsToSanitize` property', async () => {
      expect.assertions(2);
      const body = { message: 'Request Failed' };
      const response = {
        statusCode: 400,
        body
      };

      postmanRequest.defaults.mockImplementation(
        () => (requestOptions: HttpRequestOptions, cb: PostmanRequestCallback) => {
          cb(null, response, body);
        }
      );

      const request = new PolarityRequest({
        requestOptionsToSanitize: ['headers.custom']
      });
      const userOptionsExternal = { customOption: true };
      const requestOptionsExternal = {
        url: 'http://example.com',
        headers: {
          custom: 'Basic abc123'
        }
      };

      request.userOptions = userOptionsExternal;

      try {
        await request.run(requestOptionsExternal);
      } catch (error) {
        expect(error instanceof ApiRequestError).toBeTruthy();
        expect(error.requestOptions.headers.custom).toEqual('**********');
      }
    });

    it('should throw a NetworkError from an unsuccessful API request', async () => {
      expect.assertions(1);
      const networkError = new Error('Network Error');

      postmanRequest.defaults.mockImplementation(
        () => (requestOptions: HttpRequestOptions, cb: PostmanRequestCallback) => {
          cb(networkError);
        }
      );

      const request = new PolarityRequest();
      const userOptionsExternal = { customOption: true };
      const requestOptionsExternal = { url: 'http://example.com' };

      request.userOptions = userOptionsExternal;

      try {
        await request.run(requestOptionsExternal);
      } catch (error) {
        expect(error instanceof NetworkError).toBeTruthy();
      }
    });

    it('should call request with requestOptions modified by `beforeRequest` hooks', async () => {
      expect.assertions(1);
      const body = { message: 'Request Ran' };
      const response = {
        statusCode: 200,
        body
      };

      postmanRequest.defaults.mockImplementation(
        () => (requestOptions: HttpRequestOptions, cb: PostmanRequestCallback) => {
          expect(requestOptions).toEqual(mergedRequestOptions);
          cb(null, response, body);
        }
      );

      const userOptionsExternal = { customOption: true };
      const requestOptionsExternal = { url: 'http://example.com' };
      const mergedRequestOptions = {
        url: 'http://example.org',
        qs: {
          page: 1
        }
      };
      const beforeRequest: BeforeRequestHook = async (
        requestOptions,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        userOptions
      ) => {
        requestOptions.url = 'http://example.org';
        requestOptions.qs = {
          page: 1
        };
        return requestOptions;
      };

      const request = new PolarityRequest({
        hooks: { beforeRequest: [beforeRequest] }
      });
      request.userOptions = userOptionsExternal;

      await request.run(requestOptionsExternal);
    });

    it('`beforeRequest` hooks should support deleting existing options', async () => {
      expect.assertions(2);
      const body = { message: 'Request Ran' };
      const response = {
        statusCode: 200,
        body
      };

      postmanRequest.defaults.mockImplementation(
        () => (requestOptions: HttpRequestOptions, cb: PostmanRequestCallback) => {
          expect(requestOptions).toEqual(mergedRequestOptions);
          // Original requestOptions object is not modified
          expect(requestOptionsExternal).toEqual({
            url: 'http://example.com',
            qs: { page: 1 }
          });
          cb(null, response, body);
        }
      );

      const userOptionsExternal = { customOption: true };
      const requestOptionsExternal = { url: 'http://example.com', qs: { page: 1 } };
      const mergedRequestOptions = {
        url: 'http://example.com'
      };

      const beforeRequest: BeforeRequestHook = async (
        requestOptions,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        userOptions
      ) => {
        delete requestOptions.qs;
        return requestOptions;
      };

      const request = new PolarityRequest({
        hooks: { beforeRequest: [beforeRequest] }
      });
      request.userOptions = userOptionsExternal;

      await request.run(requestOptionsExternal);
    });

    it('should throw an ApiRequestError due to a response property set via `httpResponseErrorProperties`', async () => {
      expect.assertions(2);
      const body = { message: 'Request Failed', error: { code: '400' } };
      const response = {
        statusCode: 200,
        body
      };

      postmanRequest.defaults.mockImplementation(
        () => (requestOptions: HttpRequestOptions, cb: PostmanRequestCallback) => {
          cb(null, response, body);
        }
      );

      const request = new PolarityRequest({
        httpResponseErrorProperties: ['error.code']
      });
      const userOptionsExternal = { customOption: true };
      const requestOptionsExternal = { url: 'http://example.com' };

      request.userOptions = userOptionsExternal;

      try {
        await request.run(requestOptionsExternal);
      } catch (error) {
        expect(error instanceof ApiRequestError).toBeTruthy();
        expect(error.message).toEqual('400');
      }
    });

    it('should throw an ApiRequestError with the message property set via the `httpResponseErrorMessageProperties`', async () => {
      expect.assertions(2);
      const body = { message: 'Request Failed', error: { message: 'Bad Request' } };
      const response = {
        statusCode: 400,
        body
      };

      postmanRequest.defaults.mockImplementation(
        () => (requestOptions: HttpRequestOptions, cb: PostmanRequestCallback) => {
          cb(null, response, body);
        }
      );

      const request = new PolarityRequest({
        httpResponseErrorMessageProperties: ['error.message']
      });
      const userOptionsExternal = { customOption: true };
      const requestOptionsExternal = { url: 'http://example.com' };

      request.userOptions = userOptionsExternal;

      try {
        await request.run(requestOptionsExternal);
      } catch (error) {
        expect(error instanceof ApiRequestError).toBeTruthy();
        expect(error.message).toEqual('Bad Request');
      }
    });

    it('should throw an ApiRequestError with the multiple message properties set via the `httpResponseErrorMessageProperties`', async () => {
      expect.assertions(2);
      const body = { message: 'Request Failed', error: { message: 'Bad Request' } };
      const response = {
        statusCode: 400,
        body
      };

      postmanRequest.defaults.mockImplementation(
        () => (requestOptions: HttpRequestOptions, cb: PostmanRequestCallback) => {
          cb(null, response, body);
        }
      );

      const request = new PolarityRequest({
        // First property does not exist so should fall back to the second property
        httpResponseErrorMessageProperties: ['error.output', 'error.message']
      });
      const userOptionsExternal = { customOption: true };
      const requestOptionsExternal = { url: 'http://example.com' };

      request.userOptions = userOptionsExternal;

      try {
        await request.run(requestOptionsExternal);
      } catch (error) {
        expect(error instanceof ApiRequestError).toBeTruthy();
        expect(error.message).toEqual('Bad Request');
      }
    });

    it('should call `isApiError` with the correct statusCode, body, httpResponse, and requestOptions and throw error', async () => {
      expect.assertions(5);
      const body = { message: 'Request Failed' };
      const response = {
        statusCode: 200,
        body
      };

      postmanRequest.defaults.mockImplementation(
        () => (requestOptions: HttpRequestOptions, cb: PostmanRequestCallback) => {
          cb(null, response, body);
        }
      );

      const request = new PolarityRequest({
        isApiError: (httpResponse, requestOptions, userOptions) => {
          expect(httpResponse).toEqual(response);
          expect(requestOptions).toEqual(requestOptionsExternal);
          expect(userOptions).toEqual(userOptionsExternal);
          return {
            isApiError: true
          };
        }
      });
      const userOptionsExternal = { customOption: true };
      const requestOptionsExternal = { url: 'http://example.com' };

      request.userOptions = userOptionsExternal;

      try {
        await request.run(requestOptionsExternal);
      } catch (error) {
        expect(error instanceof ApiRequestError).toBeTruthy();
        // default error message
        expect(error.message).toEqual('Unexpected Error HTTP Response Received');
      }
    });

    it('should call `isApiError` and return custom error message', async () => {
      expect.assertions(2);
      const body = { message: 'Request Failed' };
      const response = {
        statusCode: 200,
        body
      };
      const customErrorMessage = 'this is a custom error message';

      postmanRequest.defaults.mockImplementation(
        () => (requestOptions: HttpRequestOptions, cb: PostmanRequestCallback) => {
          cb(null, response, body);
        }
      );

      const request = new PolarityRequest({
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        isApiError: (httpResponse, requestOptions, userOptions) => {
          return {
            isApiError: true,
            message: customErrorMessage
          };
        }
      });
      const userOptionsExternal = { customOption: true };
      const requestOptionsExternal = { url: 'http://example.com' };

      request.userOptions = userOptionsExternal;

      try {
        await request.run(requestOptionsExternal);
      } catch (error) {
        expect(error instanceof ApiRequestError).toBeTruthy();
        expect(error.message).toEqual(customErrorMessage);
      }
    });

    it('should call `isApiError` and throw a `LibraryUsageError` if the return object is not valid', async () => {
      expect.assertions(1);
      const body = { message: 'Request Failed' };
      const response = {
        statusCode: 200,
        body
      };

      postmanRequest.defaults.mockImplementation(
        () => (requestOptions: HttpRequestOptions, cb: PostmanRequestCallback) => {
          cb(null, response, body);
        }
      );

      const request = new PolarityRequest({
        // @ts-expect-error testing invalid return type
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        isApiError: (httpResponse, requestOptions, userOptions) => {
          return {};
        }
      });
      const userOptionsExternal = { customOption: true };
      const requestOptionsExternal = { url: 'http://example.com' };

      request.userOptions = userOptionsExternal;

      try {
        await request.run(requestOptionsExternal);
      } catch (error) {
        expect(error instanceof LibraryUsageError).toBeTruthy();
      }
    });

    it('should not throw error if `isApiError` returns false', async () => {
      expect.assertions(1);
      const body = { message: 'Request Failed' };
      const response = {
        statusCode: 200,
        body
      };

      postmanRequest.defaults.mockImplementation(
        () => (requestOptions: HttpRequestOptions, cb: PostmanRequestCallback) => {
          cb(null, response, body);
        }
      );

      const request = new PolarityRequest({
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        isApiError: (httpResponse, requestOptions, userOptions) => {
          return {
            isApiError: false
          };
        }
      });
      const userOptionsExternal = { customOption: true };
      const requestOptionsExternal = { url: 'http://example.com' };

      request.userOptions = userOptionsExternal;

      await expect(request.run(requestOptionsExternal)).resolves.not.toThrow();
    });

    it('should throw `libraryUsageError` if `isApiError` does not return proper format', async () => {
      expect.assertions(1);
      const body = { message: 'Request Failed' };
      const response = {
        statusCode: 200,
        body
      };

      postmanRequest.defaults.mockImplementation(
        () => (requestOptions: HttpRequestOptions, cb: PostmanRequestCallback) => {
          cb(null, response, body);
        }
      );

      const request = new PolarityRequest({
        // @ts-expect-error testing invalid return type
        isApiError: () => {
          return true;
        }
      });
      const userOptionsExternal = { customOption: true };
      const requestOptionsExternal = { url: 'http://example.com' };

      request.userOptions = userOptionsExternal;

      try {
        await request.run(requestOptionsExternal);
      } catch (error) {
        expect(error instanceof LibraryUsageError).toBeTruthy();
      }
    });

    it('should call `onNetworkError` hooks with correct error on network failure', async () => {
      expect.assertions(3);

      const networkError = new Error('Network Error');
      postmanRequest.defaults.mockImplementation(
        () => (requestOptions: HttpRequestOptions, cb: PostmanRequestCallback) => {
          cb(networkError);
        }
      );

      const userOptionsExternal = { customOption: true };
      const requestOptionsExternal = { url: 'http://example.com' };

      const onNetworkError = async (error, requestOptions, userOptions) => {
        expect(error instanceof NetworkError).toBeTruthy();
        expect(requestOptions).toEqual(requestOptionsExternal);
        expect(userOptions).toEqual(userOptionsExternal);
      };

      const request = new PolarityRequest({
        hooks: { onNetworkError: [onNetworkError] }
      });
      request.userOptions = userOptionsExternal;

      await request.run(requestOptionsExternal);
    });

    it('should throw error thrown by `onNetworkError` hook', async () => {
      expect.assertions(2);

      const networkError = new Error('Network Error');
      postmanRequest.defaults.mockImplementation(
        () => (requestOptions: HttpRequestOptions, cb: PostmanRequestCallback) => {
          cb(networkError);
        }
      );

      const userOptionsExternal = { customOption: true };
      const requestOptionsExternal = { url: 'http://example.com' };

      const onNetworkError = async () => {
        throw new ApiRequestError('API Error');
      };

      const request = new PolarityRequest({
        hooks: { onNetworkError: [onNetworkError] }
      });
      request.userOptions = userOptionsExternal;

      try {
        await request.run(requestOptionsExternal);
      } catch (error) {
        expect(error instanceof ApiRequestError).toBeTruthy();
        expect(error.message).toEqual('API Error');
      }
    });

    it('should not throw error if `onNetworkError` hook suppresses the error', async () => {
      expect.assertions(2);

      postmanRequest.defaults.mockImplementation(
        () => (requestOptions: HttpRequestOptions, cb: PostmanRequestCallback) => {
          cb(new Error('Network Error'));
        }
      );

      const userOptionsExternal = { customOption: true };
      const requestOptionsExternal = { url: 'http://example.com' };

      // Without hooks, should throw
      const requestNoHooks = new PolarityRequest();
      requestNoHooks.userOptions = userOptionsExternal;

      try {
        await requestNoHooks.run(requestOptionsExternal);
      } catch (error) {
        expect(error instanceof NetworkError).toBeTruthy();
      }

      // With onNetworkError hook that doesn't throw, should suppress
      const requestWithHook = new PolarityRequest({
        hooks: { onNetworkError: [async () => {}] }
      });
      requestWithHook.userOptions = userOptionsExternal;

      const result = await requestWithHook.run(requestOptionsExternal);
      expect(result).toBeUndefined();
    });

    it('should call `onApiError` hooks with error and response when API error detected', async () => {
      expect.assertions(6);
      const body = { message: 'Request Failed' };
      const response = {
        statusCode: 400,
        body
      };

      postmanRequest.defaults.mockImplementation(
        () => (requestOptions: HttpRequestOptions, cb: PostmanRequestCallback) => {
          cb(null, response, body);
        }
      );

      const userOptionsExternal = { customOption: true };
      const requestOptionsExternal = { url: 'http://example.com' };

      const onApiError = async (error, hookResponse, requestOptions, userOptions) => {
        expect(error instanceof ApiRequestError).toBeTruthy();
        expect(hookResponse.statusCode).toEqual(400);
        expect(hookResponse.body).toEqual(body);
        expect(requestOptions).toEqual(requestOptionsExternal);
        expect(userOptions).toEqual(userOptionsExternal);
      };

      const request = new PolarityRequest({
        hooks: { onApiError: [onApiError] }
      });
      request.userOptions = userOptionsExternal;

      // Error is suppressed because hook returns without throwing
      const result = await request.run(requestOptionsExternal);
      expect(result).toEqual(response);
    });

    it('should propagate error thrown by `onApiError` hook', async () => {
      expect.assertions(2);
      const body = { message: 'Request Failed' };
      const response = {
        statusCode: 400,
        body
      };

      postmanRequest.defaults.mockImplementation(
        () => (requestOptions: HttpRequestOptions, cb: PostmanRequestCallback) => {
          cb(null, response, body);
        }
      );

      const userOptionsExternal = { customOption: true };
      const requestOptionsExternal = { url: 'http://example.com' };

      const onApiError = async (error) => {
        throw new ApiRequestError('Custom error: ' + error.message);
      };

      const request = new PolarityRequest({
        hooks: { onApiError: [onApiError] }
      });
      request.userOptions = userOptionsExternal;

      try {
        await request.run(requestOptionsExternal);
      } catch (error) {
        expect(error instanceof ApiRequestError).toBeTruthy();
        expect(error.message).toContain('Custom error:');
      }
    });

    it('should chain multiple `beforeRequest` hooks in order', async () => {
      expect.assertions(1);
      const body = { message: 'Request Ran' };
      const response = {
        statusCode: 200,
        body
      };

      postmanRequest.defaults.mockImplementation(
        () => (requestOptions: HttpRequestOptions, cb: PostmanRequestCallback) => {
          expect(requestOptions).toEqual({
            url: 'http://example.com',
            headers: { 'X-Auth': 'token123', 'X-Custom': 'value' }
          });
          cb(null, response, body);
        }
      );

      const addAuth: BeforeRequestHook = async (opts) => {
        return { ...opts, headers: { ...((opts.headers as object) || {}), 'X-Auth': 'token123' } };
      };

      const addCustomHeader: BeforeRequestHook = async (opts) => {
        return { ...opts, headers: { ...((opts.headers as object) || {}), 'X-Custom': 'value' } };
      };

      const request = new PolarityRequest({
        hooks: { beforeRequest: [addAuth, addCustomHeader] }
      });
      request.userOptions = { customOption: true };

      await request.run({ url: 'http://example.com' });
    });

    it('should chain multiple `afterResponse` hooks in order', async () => {
      expect.assertions(1);
      const body = { data: { name: 'test', extra: 'field' } };
      const response = {
        statusCode: 200,
        body
      };

      postmanRequest.defaults.mockImplementation(
        () => (requestOptions: HttpRequestOptions, cb: PostmanRequestCallback) => {
          cb(null, response, body);
        }
      );

      const extractData: AfterResponseHook = async (resp) => {
        return { ...resp, body: (resp.body as { data: unknown }).data };
      };

      const addTimestamp: AfterResponseHook = async (resp) => {
        return { ...resp, processedAt: 'now' };
      };

      const request = new PolarityRequest({
        hooks: { afterResponse: [extractData, addTimestamp] }
      });
      request.userOptions = { customOption: true };

      const result = await request.run({ url: 'http://example.com' });
      expect(result).toEqual({
        statusCode: 200,
        body: { name: 'test', extra: 'field' },
        processedAt: 'now'
      });
    });

    it('should throw LibraryUsageError if `beforeRequest` hook returns undefined', async () => {
      expect.assertions(2);

      const request = new PolarityRequest({
        hooks: {
          beforeRequest: [async () => undefined as never]
        }
      });
      request.userOptions = { customOption: true };

      try {
        await request.run({ url: 'http://example.com' });
      } catch (error) {
        expect(error instanceof LibraryUsageError).toBeTruthy();
        expect(error.message).toContain('beforeRequest');
      }
    });

    it('should throw LibraryUsageError if `afterResponse` hook returns undefined', async () => {
      expect.assertions(2);

      const request = new PolarityRequest({
        hooks: {
          afterResponse: [async () => undefined as never]
        }
      });
      request.userOptions = { customOption: true };

      try {
        await request.run({ url: 'http://example.com' });
      } catch (error) {
        expect(error instanceof LibraryUsageError).toBeTruthy();
        expect(error.message).toContain('afterResponse');
      }
    });

    it('should execute limiter.schedule() if limiter is set', async () => {
      expect.assertions(1);
      const body = { message: 'Request Ran' };
      const response = {
        statusCode: 200,
        body
      };

      postmanRequest.defaults.mockImplementation(
        () => (requestOptions: HttpRequestOptions, cb: PostmanRequestCallback) => {
          cb(null, response, body);
        }
      );

      const limiter = createMockLimiter();
      const request = new PolarityRequest({ limiter });

      const userOptionsExternal = { customOption: true };
      const requestOptionsExternal = { url: 'http://example.com' };
      request.userOptions = userOptionsExternal;

      await request.run(requestOptionsExternal);
      expect(limiter.schedule).toHaveBeenCalledTimes(1);
    });

    it('should catch BottleneckError and throw a RetryRequestError if limiter is set', async () => {
      expect.assertions(2);

      postmanRequest.defaults.mockImplementation(
        () => (requestOptions: HttpRequestOptions, cb: PostmanRequestCallback) => {
          cb(null, { statusCode: 200, body: {} }, {});
        }
      );

      const limiter = createMockLimiter();
      limiter.schedule = jest.fn(() => {
        throw new BottleneckError('Bottleneck Error');
      });
      const request = new PolarityRequest({ limiter });
      const userOptionsExternal = { customOption: true };
      const requestOptionsExternal = { url: 'http://example.com' };
      request.userOptions = userOptionsExternal;

      try {
        await request.run(requestOptionsExternal);
      } catch (requestError) {
        expect(requestError instanceof RetryRequestError).toBeTruthy();
      }

      expect(limiter.schedule).toHaveBeenCalledTimes(1);
    });

    it('should allow setting limiter as a mutable property after construction', async () => {
      expect.assertions(1);
      const body = { message: 'Request Ran' };
      const response = { statusCode: 200, body };

      postmanRequest.defaults.mockImplementation(
        () => (requestOptions: HttpRequestOptions, cb: PostmanRequestCallback) => {
          cb(null, response, body);
        }
      );

      const request = new PolarityRequest();
      const limiter = createMockLimiter();
      request.limiter = limiter;

      request.userOptions = { customOption: true };

      await request.run({ url: 'http://example.com' });
      expect(limiter.schedule).toHaveBeenCalledTimes(1);
    });
  });

  describe('Constructor logger fallback', () => {
    it('should use getLogger() directly when logger has no child() method', () => {
      const loggerWithoutChild = {
        trace: jest.fn(),
        info: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
        fatal: jest.fn(),
        warn: jest.fn()
      };
      setLogger(loggerWithoutChild as never);
      const request = new PolarityRequest();
      // The logger should be the same reference since child() doesn't exist
      expect(
        (request as unknown as { logger: unknown }).logger
      ).toBe(loggerWithoutChild);
      // Restore normal logger for other tests
      setLogger(identityLogger);
    });
  });

  describe('run() error handling', () => {
    it('should rethrow LibraryUsageError from requestWithDefaults without wrapping', async () => {
      expect.assertions(2);
      const libError = new LibraryUsageError('Bad usage in request');

      postmanRequest.defaults.mockImplementation(
        () => () => {
          throw libError;
        }
      );

      const request = new PolarityRequest();
      request.userOptions = { customOption: true };

      try {
        await request.run({ url: 'http://example.com' });
      } catch (error) {
        expect(error).toBe(libError);
        expect(error instanceof LibraryUsageError).toBeTruthy();
      }
    });
  });

  describe('sanitizeRequestOptions()', () => {
    it('masks Authorization header regardless of case', () => {
      const options = {
        url: 'http://example.com',
        headers: { Authorization: 'MyToken' }
      };
      const sanitized = sanitizeRequestOptions(options);
      expect(
        (sanitized.headers as Record<string, unknown>)?.Authorization
      ).toBe('**********');
    });

    it('masks additional user-supplied paths', () => {
      const sanitized = sanitizeRequestOptions(
        { body: { password: 'p', token: 't' } },
        ['body.token']
      );
      const body = sanitized.body as Record<string, unknown>;
      expect(body.password).toBe('**********');
      expect(body.token).toBe('**********');
    });

    it('masks x-api-key header regardless of case', () => {
      const options = {
        url: 'http://example.com',
        headers: { 'x-api-key': 'SuperSecret' }
      };
      const res = sanitizeRequestOptions(options);
      expect(res.headers?.['x-api-key']).toBe('**********');
    });

    it('handles requestOptions without headers', () => {
      const options = { url: 'http://example.com' };
      const res = sanitizeRequestOptions(options);
      expect(res).toEqual(options);
      expect(res).not.toBe(options); // returns a clone
    });
  });

  describe('runInParallel()', () => {
    it('should return multiple responses from a successful API request', async () => {
      expect.assertions(3);
      const bodyIp = { message: 'IP Lookup' };
      const bodyDomain = { message: 'Domain lookup' };
      const responseIp = {
        statusCode: 200,
        body: bodyIp
      };
      const responseDomain = {
        statusCode: 200,
        body: bodyDomain
      };

      postmanRequest.defaults.mockImplementation(
        () => (requestOptions: HttpRequestOptions, cb: PostmanRequestCallback) => {
          if (requestOptions.entity.isIP) {
            cb(null, responseIp, bodyIp);
          } else {
            cb(null, responseDomain, bodyDomain);
          }
        }
      );

      const request = new PolarityRequest();
      const userOptionsExternal = { customOption: true };
      const allRequestOptions = [
        {
          url: 'http://example.com/ip',
          entity: entity
        },
        {
          url: 'http://example.com/domain',
          entity: entityDomain
        }
      ];

      request.userOptions = userOptionsExternal;

      const results = await request.runInParallel({
        allRequestOptions
      });

      expect(results.length).toEqual(2);
      expect(results[0].body).toEqual(bodyIp);
      expect(results[1].body).toEqual(bodyDomain);
    });

    it('should throw an error if any API request fails', async () => {
      expect.assertions(3);
      const bodyIp = { message: 'IP Lookup' };
      const bodyDomain = { message: 'Domain lookup' };
      const responseIp = {
        statusCode: 200,
        body: bodyIp
      };
      const responseDomain = {
        statusCode: 400,
        body: bodyDomain
      };

      postmanRequest.defaults.mockImplementation(
        () => (requestOptions: HttpRequestOptions, cb: PostmanRequestCallback) => {
          if (requestOptions.entity.isIP) {
            cb(null, responseIp, bodyIp);
          } else {
            cb(null, responseDomain, bodyDomain);
          }
        }
      );

      const request = new PolarityRequest();
      const userOptionsExternal = { customOption: true };
      const allRequestOptions = [
        {
          url: 'http://example.com/ip',
          entity: entity
        },
        {
          url: 'http://example.com/domain',
          entity: entityDomain
        }
      ];

      request.userOptions = userOptionsExternal;

      try {
        await request.runInParallel({
          allRequestOptions
        });
      } catch (error) {
        expect(error instanceof ApiRequestError).toBeTruthy();
        expect(error.message).toEqual(`Unexpected HTTP Status Code 400 Received`);
        expect(error.meta.body).toEqual(bodyDomain);
      }
    });

    it('should not throw an error if an API request fails and `returnErrors` is true', async () => {
      expect.assertions(3);
      const bodyIp = { message: 'IP Lookup' };
      const bodyDomain = { message: 'Domain lookup' };
      const responseIp = {
        statusCode: 200,
        body: bodyIp
      };
      const responseDomain = {
        statusCode: 400,
        body: bodyDomain
      };

      postmanRequest.defaults.mockImplementation(
        () => (requestOptions: HttpRequestOptions, cb: PostmanRequestCallback) => {
          if (requestOptions.entity.isIP) {
            cb(null, responseIp, bodyIp);
          } else {
            cb(null, responseDomain, bodyDomain);
          }
        }
      );

      const request = new PolarityRequest();
      const userOptionsExternal = { customOption: true };
      const allRequestOptions = [
        {
          url: 'http://example.com/ip',
          entity: entity
        },
        {
          url: 'http://example.com/domain',
          entity: entityDomain
        }
      ];

      request.userOptions = userOptionsExternal;

      const results = await request.runInParallel({
        allRequestOptions,
        returnErrors: true
      });

      expect(results.length).toEqual(2);
      expect(results[0].body).toEqual(bodyIp);
      expect(results[1].error instanceof ApiRequestError).toBeTruthy();
    });

    it('should run requests serially if `maxConcurrentRequests` option is set to 1', async () => {
      expect.assertions(3);
      const taskExecutionTimeInMilliseconds = 100;
      const bodyIp = { message: 'IP Lookup' };
      const bodyDomain = { message: 'Domain lookup' };
      const responseIp = {
        statusCode: 200,
        body: bodyIp
      };
      const responseDomain = {
        statusCode: 200,
        body: bodyDomain
      };

      postmanRequest.defaults.mockImplementation(
        () => (requestOptions: HttpRequestOptions, cb: PostmanRequestCallback) => {
          if (requestOptions.entity.isIP) {
            setTimeout(
              () => cb(null, responseIp, bodyIp),
              taskExecutionTimeInMilliseconds
            );
          } else {
            setTimeout(
              () => cb(null, responseDomain, bodyDomain),
              taskExecutionTimeInMilliseconds
            );
          }
        }
      );

      const request = new PolarityRequest();
      const userOptionsExternal = { customOption: true };
      const allRequestOptions = [
        {
          url: 'http://example.com/ip',
          entity: entity
        },
        {
          url: 'http://example.com/domain',
          entity: entityDomain
        }
      ];

      request.userOptions = userOptionsExternal;

      const startTime = Date.now();
      const results = await request.runInParallel({
        allRequestOptions,
        maxConcurrentRequests: 1
      });
      expect(Date.now() - startTime).toBeGreaterThanOrEqual(
        allRequestOptions.length * taskExecutionTimeInMilliseconds
      );
      expect(results[0].body).toEqual(bodyIp);
      expect(results[1].body).toEqual(bodyDomain);
    });

    it('should run requests in parallel if `maxConcurrentRequests` option is set to 2', async () => {
      expect.assertions(3);
      const taskExecutionTimeInMilliseconds = 100;
      const bodyIp = { message: 'IP Lookup' };
      const bodyDomain = { message: 'Domain lookup' };
      const responseIp = {
        statusCode: 200,
        body: bodyIp
      };
      const responseDomain = {
        statusCode: 200,
        body: bodyDomain
      };

      postmanRequest.defaults.mockImplementation(
        () => (requestOptions: HttpRequestOptions, cb: PostmanRequestCallback) => {
          if (requestOptions.entity.isIP) {
            setTimeout(
              () => cb(null, responseIp, bodyIp),
              taskExecutionTimeInMilliseconds
            );
          } else {
            setTimeout(
              () => cb(null, responseDomain, bodyDomain),
              taskExecutionTimeInMilliseconds
            );
          }
        }
      );

      const request = new PolarityRequest();
      const userOptionsExternal = { customOption: true };
      const allRequestOptions = [
        {
          url: 'http://example.com/ip',
          entity: entity
        },
        {
          url: 'http://example.com/domain',
          entity: entityDomain
        }
      ];

      request.userOptions = userOptionsExternal;

      const startTime = Date.now();
      const results = await request.runInParallel({
        allRequestOptions,
        maxConcurrentRequests: 2
      });
      expect(Date.now() - startTime).toBeLessThan(
        allRequestOptions.length * taskExecutionTimeInMilliseconds -
          taskExecutionTimeInMilliseconds / 2
      );
      expect(results[0].body).toEqual(bodyIp);
      expect(results[1].body).toEqual(bodyDomain);
    });

    it('should attach `entities` array to response when provided on requestOptions', async () => {
      expect.assertions(2);
      const body = { message: 'Bulk Lookup' };
      const response = { statusCode: 200, body };

      postmanRequest.defaults.mockImplementation(
        () => (requestOptions: HttpRequestOptions, cb: PostmanRequestCallback) => {
          cb(null, response, body);
        }
      );

      const request = new PolarityRequest();
      request.userOptions = { customOption: true };

      const entitiesList = [entity, entityDomain];
      const results = await request.runInParallel({
        allRequestOptions: [
          { url: 'http://example.com/bulk', entities: entitiesList }
        ]
      });

      expect(results.length).toEqual(1);
      expect(results[0].entities).toBe(entitiesList);
    });

    it('should attach `requestId` to response when provided on requestOptions', async () => {
      expect.assertions(2);
      const body = { message: 'Identified Request' };
      const response = { statusCode: 200, body };

      postmanRequest.defaults.mockImplementation(
        () => (requestOptions: HttpRequestOptions, cb: PostmanRequestCallback) => {
          cb(null, response, body);
        }
      );

      const request = new PolarityRequest();
      request.userOptions = { customOption: true };

      const results = await request.runInParallel({
        allRequestOptions: [
          { url: 'http://example.com/req1', requestId: 'request-abc-123' }
        ]
      });

      expect(results.length).toEqual(1);
      expect(results[0].requestId).toBe('request-abc-123');
    });
  });
});
