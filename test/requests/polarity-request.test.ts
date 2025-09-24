import { setLogger } from '../../lib/logging/logger';
import { identity } from 'lodash/fp';
import {
  HttpRequestOptions,
  HttpRequestResponse,
  PolarityRequest,
  PostprocessRequestSuccess,
  PreprocessRequestOptions
} from '../../lib/requests/polarity-request';
import postmanRequest from 'postman-request';
import Bottleneck from 'bottleneck';
import {
  ApiRequestError,
  LibraryUsageError,
  NetworkError,
  RetryRequestError
} from '../../lib/errors';
import { Entity } from '../../lib/types';

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
jest.mock('bottleneck');

jest.mock('fs', () => ({
  readFileSync: jest.fn().mockImplementation((x) => x)
}));

const entity: Entity = {
  value: '8.8.8.8',
  types: ['IP', 'IPv4'],
  type: 'IP',
  requestContext: { requestType: 'onDemand', isUserInitiated: true },
  longitude: 0,
  latitude: 0,
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
  IPType: 'public'
};

const entityDomain: Entity = {
  value: 'google.com',
  types: ['domain'],
  type: 'domain',
  requestContext: { requestType: 'onDemand', isUserInitiated: true },
  longitude: 0,
  latitude: 0,
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
      expect.assertions(11);

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
      expect(request.throttlingOptions).toEqual(undefined);
      expect(typeof request.preprocessRequestOptions).toEqual('function');
      expect(typeof request.postprocessRequestFailure).toEqual('function');
      expect(typeof request.postprocessRequestSuccess).toEqual('function');
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

    it('should create a PolarityRequest object with `throttlingOptions` set', () => {
      expect.assertions(1);
      const throttlingOptions = { maxRequestsPerSecond: 5 };
      const request = new PolarityRequest({
        throttlingOptions
      });
      expect(request.throttlingOptions).toEqual(throttlingOptions);
    });

    it('should create a PolarityRequest object with `preprocessRequestOptions` set', () => {
      expect.assertions(1);
      const preprocessRequestOptions = jest.fn();
      const request = new PolarityRequest({
        preprocessRequestOptions
      });
      expect(request.preprocessRequestOptions).toEqual(preprocessRequestOptions);
    });

    it('should create a PolarityRequest object with `postprocessRequestFailure` set', () => {
      expect.assertions(1);
      const postprocessRequestFailure = jest.fn();
      const request = new PolarityRequest({
        postprocessRequestFailure
      });
      expect(request.postprocessRequestFailure).toEqual(postprocessRequestFailure);
    });

    it('should create a PolarityRequest object with `postprocessRequestSuccess` set', () => {
      expect.assertions(1);
      const postprocessRequestSuccess = jest.fn();
      const request = new PolarityRequest({
        postprocessRequestSuccess
      });
      expect(request.postprocessRequestSuccess).toEqual(postprocessRequestSuccess);
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

  describe('Middleware Functions Default Behavior', () => {
    it('should return requestOptions unmodified in preprocessRequestOptions', async () => {
      expect.assertions(1);
      const request = new PolarityRequest();
      const userOptions = { customOption: true };
      const requestOptions = { url: 'http://example.com' };
      const result = await request.preprocessRequestOptions(requestOptions, userOptions);
      expect(result).toEqual(requestOptions);
    });

    it('should return error unmodified in postprocessRequestFailure', async () => {
      expect.assertions(1);
      const request = new PolarityRequest();
      const error = new Error('test error');
      const userOptions = { customOption: true };
      const requestOptions = { url: 'http://example.com' };
      try {
        await request.postprocessRequestFailure(error, requestOptions, userOptions);
      } catch (thrownError) {
        expect(thrownError).toEqual(error);
      }
    });

    it('should return response unmodified in postprocessRequestSuccess', async () => {
      expect.assertions(1);
      const request = new PolarityRequest();
      const response = { statusCode: 200 } as HttpRequestResponse;
      const userOptions = { customOption: true };
      const requestOptions = { url: 'http://example.com' };
      const result = await request.postprocessRequestSuccess(
        response,
        requestOptions,
        userOptions
      );
      expect(result).toEqual(response);
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

    it('should call `preprocessRequestOptions` with the correct userOptions and requestOptions', async () => {
      expect.assertions(2);
      const request = new PolarityRequest();
      const userOptionsExternal = { customOption: true };
      const requestOptionsExternal = { url: 'http://example.com' };

      const preprocessRequestOptions: PreprocessRequestOptions = async (
        requestOptions,
        userOptions
      ) => {
        expect(userOptions).toEqual(userOptionsExternal);
        expect(requestOptions).toEqual(requestOptionsExternal);
        return requestOptions;
      };

      request.userOptions = userOptionsExternal;
      request.preprocessRequestOptions = preprocessRequestOptions;

      await request.run(requestOptionsExternal);
    });

    it('should call `postprocessRequestSuccess` with the correct httpResponse, requestOptions, and userOptions', async () => {
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

      const request = new PolarityRequest();
      const userOptionsExternal = { customOption: true };
      const requestOptionsExternal = { url: 'http://example.com' };

      const postprocessRequestSuccess: PostprocessRequestSuccess = async (
        response,
        requestOptions,
        userOptions
      ) => {
        expect(response).toEqual(response);
        expect(userOptions).toEqual(userOptionsExternal);
        expect(requestOptions).toEqual(requestOptionsExternal);
        return response;
      };

      request.userOptions = userOptionsExternal;
      request.postprocessRequestSuccess = postprocessRequestSuccess;

      await request.run(requestOptionsExternal);
    });

    it('should call `postprocessRequestFailure` with the correct error, requestOptions, and userOptions', async () => {
      expect.assertions(3);

      const networkError = new Error('Network Error');
      postmanRequest.defaults.mockImplementation(
        () => (requestOptions: HttpRequestOptions, cb: PostmanRequestCallback) => {
          cb(networkError);
        }
      );

      const request = new PolarityRequest();
      const userOptionsExternal = { customOption: true };
      const requestOptionsExternal = { url: 'http://example.com' };

      const postprocessRequestFailure = async (error, requestOptions, userOptions) => {
        expect(error instanceof NetworkError).toBeTruthy();
        expect(requestOptions).toEqual(requestOptionsExternal);
        expect(userOptions).toEqual(userOptionsExternal);
      };

      request.userOptions = userOptionsExternal;
      request.postprocessRequestFailure = postprocessRequestFailure;

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

    it('should call request with requestOptions modified by `preprocessRequestOptions` middleware', async () => {
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

      const request = new PolarityRequest();
      const userOptionsExternal = { customOption: true };
      const requestOptionsExternal = { url: 'http://example.com' };
      const mergedRequestOptions = {
        url: 'http://example.org',
        qs: {
          page: 1
        }
      };
      const preprocessRequestOptions: PreprocessRequestOptions = async (
        requestOptions,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        userOptions
      ) => {
        // should modify existing option
        requestOptions.url = 'http://example.org';

        // should add new option
        requestOptions.qs = {
          page: 1
        };

        return requestOptions;
      };

      request.userOptions = userOptionsExternal;
      request.preprocessRequestOptions = preprocessRequestOptions;

      await request.run(requestOptionsExternal);
    });

    it('`preprocessRequestOptions` middleware should support deleting existing options', async () => {
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

      const request = new PolarityRequest();
      const userOptionsExternal = { customOption: true };
      const requestOptionsExternal = { url: 'http://example.com', qs: { page: 1 } };
      const mergedRequestOptions = {
        url: 'http://example.com'
      };

      const preprocessRequestOptions: PreprocessRequestOptions = async (
        requestOptions,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        userOptions
      ) => {
        delete requestOptions.qs;
        return requestOptions;
      };

      request.userOptions = userOptionsExternal;
      request.preprocessRequestOptions = preprocessRequestOptions;

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

    it('should call `postprocessRequestFailure` with the correct error, requestOptions, and userOptions', async () => {
      expect.assertions(3);

      const networkError = new Error('Network Error');
      postmanRequest.defaults.mockImplementation(
        () => (requestOptions: HttpRequestOptions, cb: PostmanRequestCallback) => {
          cb(networkError);
        }
      );

      const request = new PolarityRequest();
      const userOptionsExternal = { customOption: true };
      const requestOptionsExternal = { url: 'http://example.com' };

      const postprocessRequestFailure = async (error, requestOptions, userOptions) => {
        expect(error instanceof NetworkError).toBeTruthy();
        expect(requestOptions).toEqual(requestOptionsExternal);
        expect(userOptions).toEqual(userOptionsExternal);
      };

      request.userOptions = userOptionsExternal;
      request.postprocessRequestFailure = postprocessRequestFailure;

      await request.run(requestOptionsExternal);
    });

    it('should throw error thrown by `postprocessRequestFailure`', async () => {
      expect.assertions(2);

      const networkError = new Error('Network Error');
      postmanRequest.defaults.mockImplementation(
        () => (requestOptions: HttpRequestOptions, cb: PostmanRequestCallback) => {
          cb(networkError);
        }
      );

      const request = new PolarityRequest();
      const userOptionsExternal = { customOption: true };
      const requestOptionsExternal = { url: 'http://example.com' };

      const postprocessRequestFailure = async () => {
        throw new ApiRequestError('API Error');
      };

      request.userOptions = userOptionsExternal;
      request.postprocessRequestFailure = postprocessRequestFailure;

      try {
        await request.run(requestOptionsExternal);
      } catch (error) {
        expect(error instanceof ApiRequestError).toBeTruthy();
        expect(error.message).toEqual('API Error');
      }
    });

    it('should not throw error if `postprocessRequestFailure` does not throw error', async () => {
      expect.assertions(2);

      postmanRequest.defaults.mockImplementation(
        () => (requestOptions: HttpRequestOptions, cb: PostmanRequestCallback) => {
          cb(new Error('Network Error'));
        }
      );

      const request = new PolarityRequest();
      const userOptionsExternal = { customOption: true };
      const requestOptionsExternal = { url: 'http://example.com' };

      request.userOptions = userOptionsExternal;

      // this will throw an error
      try {
        await request.run(requestOptionsExternal);
      } catch (error) {
        expect(error instanceof NetworkError).toBeTruthy();
      }

      // this implementation of `postprocessRequestFailure` should swallow the error
      request.postprocessRequestFailure = async () => {};

      await expect(request.run(requestOptionsExternal)).resolves.not.toThrow();
    });

    it('should execute bottleneckLimiter.schedule() if throttlingOptions is set', async () => {
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

      const request = new PolarityRequest({
        throttlingOptions: {
          maxRequestsPerSecond: 5
        }
      });

      const spy = jest
        // @ts-expect-error using spyOn to mock a private method
        .spyOn(request.bottleneckLimiter, 'schedule')
        .mockImplementation(
          (
            requestWithDefaults: (
              requestOptions: HttpRequestOptions
            ) => Promise<HttpRequestResponse>,
            requestOptions: HttpRequestOptions
          ) => {
            return requestWithDefaults(requestOptions);
          }
        );
      const userOptionsExternal = { customOption: true };
      const requestOptionsExternal = { url: 'http://example.com' };
      request.userOptions = userOptionsExternal;

      await request.run(requestOptionsExternal);
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('should catch Bottleneck.BottleneckError and throw a RetryRequestError if throttlingOptions is set', async () => {
      expect.assertions(2);
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

      const request = new PolarityRequest({
        throttlingOptions: {
          maxRequestsPerSecond: 5
        }
      });

      const spy = jest
        // @ts-expect-error using spyOn to mock a private method
        .spyOn(request.bottleneckLimiter, 'schedule')
        .mockImplementation(() => {
          throw new Bottleneck.BottleneckError('Bottleneck Error');
        });
      const userOptionsExternal = { customOption: true };
      const requestOptionsExternal = { url: 'http://example.com' };
      request.userOptions = userOptionsExternal;

      try {
        await request.run(requestOptionsExternal);
      } catch (requestError) {
        expect(requestError instanceof RetryRequestError).toBeTruthy();
      }

      expect(spy).toHaveBeenCalledTimes(1);
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
  });
});
