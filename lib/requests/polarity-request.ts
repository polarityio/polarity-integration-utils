import fs from 'fs';
import { promisify } from 'util';
import Bottleneck from 'bottleneck';
import request from 'postman-request';
import { parallelLimit } from '../internal/helpers/parallel-limit';
import get from 'lodash/get.js';
import has from 'lodash/has.js';
import {
  ApiRequestError,
  NetworkError,
  RetryRequestError,
  LibraryUsageError
} from '../errors';
import { getLogger } from '../logging';

import type { Entity, DoLookupUserOptions } from '@polarityio/integration-types';
import { sanitizeRequestOptions } from './sanitize-request-options';

/**
 * @public
 */
export type ConfigRequestProxyOptions = {
  ca?: undefined | string;
  cert?: undefined | string;
  key?: undefined | string;
  passphrase?: undefined | string;
  rejectUnauthorized?: undefined | boolean;
  proxy?: undefined | string;
  json?: undefined | boolean;
};

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';

/**
 * @public
 */
export type HttpRequestOptions = {
  /**
   * The URL to make the request to.
   */
  url?: string;
  /**
   * The HTTP method to use for the request.
   *
   * @defaultValue 'GET'
   */
  method?: HttpMethod;
  /**
   *  If true, sets body to JSON representation of value and adds Content-type: application/json header.
   *  Additionally, parses the response body as JSON.
   *
   *  @defaultValue true
   */
  json?: boolean;
  /**
   * An object containing the headers to include in the request.
   * @example
   * Here is an example of setting the "X-Api-Key" `headers` property:
   * ```
   * {
   *   headers: {
   *     'X-Api-Key': '1234567890'
   *   }
   * }
   * ```
   */
  headers?: object;
  /**
   * An object containing querystring parameters to include in the request.
   * @example
   * Here is an example of setting the `qs` property:
   * ```
   * {
   *   qs: {
   *     search: 'foo'
   *   }
   * }
   * ```
   */
  qs?: object;
  /**
   * When passed an object or a querystring, this sets body to a querystring representation of value,
   * and adds Content-type: application/x-www-form-urlencoded header.
   */
  form?: object;
  /**
   * The body of the request.
   */
  body?: object;
  /**
   * The authentication options to use for the request
   */
  auth?:
    | {
        username: string;
        password: string;
        sendImmediately?: boolean;
      }
    | {
        bearer: string;
        sendImmediately?: boolean;
      };
  [key: string]: unknown;
} & (
  | { entity: Entity; entities?: never; requestId?: never }
  | { entities: Entity[]; entity?: never; requestId?: never }
  | { requestId: string | unknown; entity?: never; entities?: never }
  | { entity?: never; entities?: never; requestId?: never }
);

/**
 * @public
 */
export type RunInParallelOptions = {
  /**
   * Array of HttpRequestOptions that will be run in parallel as specified by
   * the `maxConcurrentRequests` property.
   */
  allRequestOptions: HttpRequestOptions[];
  /**
   * Maximum number of requests to run in parallel
   *
   * @defaultValue 5
   */
  maxConcurrentRequests?: number;
  /**
   * If true, any errors thrown during the request will be returned in the response object on the `error` property
   * of the returned `HttpRequestResponse` object.  If false, any errors thrown will be thrown and should be handled by
   *
   *
   * @defaultValue false
   */
  returnErrors?: boolean;
};

/**
 * @public
 */
export type HttpRequestResponse = {
  /**
   * The HTTP status code of the response.
   */
  statusCode: number;
  request: {
    uri: unknown;
    method: string;
    headers: unknown;
    [key: string]: unknown;
  };
  /**
   * The body of the response.
   */
  body: unknown;
  /**
   * The response headers
   */
  headers: unknown;
  /**
   * The error object if an error occurred during the request.
   */
  error?: ApiRequestError | NetworkError | RetryRequestError;
  /**
   * The entity that the request was made for. The `entity` property matches the
   * `entity` property set on the {@link HttpRequestOptions} object associated with this HttpRequestResponse.
   */
  entity?: Entity;
  /**
   * An array of entities that the request was made for.  The `entities` property
   * matches the `entities` property set on the {@link HttpRequestOptions} object associated
   * with this HttpRequestResponse.
   */
  entities?: Entity[];
  /**
   * A custom request id that can be used to identify the request.  The `requestId` matches
   * the `requestId` property set on the {@link HttpRequestOptions} object.
   */
  requestId?: string | unknown;
  [key: string]: unknown;
};

/**
 * @public
 */
export type IsApiErrorResult = {
  /**
   * Indicates whether the response is an API error.
   */
  isApiError: boolean;
  /**
   * Optional message providing additional information about the API error.  The
   * returned `message` will be used as the `message` property on the {@link ApiRequestError} object
   * thrown by the request.
   */
  message?: string;
};

/**
 * @public
 */
export type IsApiErrorFunction = (
  response: HttpRequestResponse,
  requestOptions: HttpRequestOptions,
  userOptions: DoLookupUserOptions
) => IsApiErrorResult;

/**
 * Hook that runs before an HTTP request is made. Each hook receives the output
 * of the previous hook, allowing request options to be modified in a chain.
 *
 * Typically used for adding authentication headers or conditionally modifying
 * request options based on user options.
 *
 * @public
 */
export type BeforeRequestHook = (
  requestOptions: HttpRequestOptions,
  userOptions: DoLookupUserOptions
) => Promise<HttpRequestOptions>;

/**
 * Hook that runs after a successful HTTP response. Each hook receives the output
 * of the previous hook, allowing the response to be modified in a chain.
 *
 * Typically used to extract specific fields from the response body or to
 * transform the response into a more useful shape.
 *
 * @public
 */
export type AfterResponseHook = (
  response: HttpRequestResponse,
  requestOptions: HttpRequestOptions,
  userOptions: DoLookupUserOptions
) => Promise<HttpRequestResponse>;

/**
 * Hook that runs when an API error is detected (non-success status code or error
 * properties found in the response body). Receives the full HTTP response so the
 * hook can inspect status codes, headers, and body.
 *
 * If all registered hooks return without throwing, the error is suppressed and
 * the HTTP response is returned to the caller. To propagate or replace the error,
 * throw from within the hook.
 *
 * @public
 */
export type OnApiErrorHook = (
  error: ApiRequestError,
  response: HttpRequestResponse,
  requestOptions: HttpRequestOptions,
  userOptions: DoLookupUserOptions
) => Promise<void>;

/**
 * Hook that runs when a network error or rate-limiting error occurs during a request.
 *
 * If all registered hooks return without throwing, the error is suppressed.
 * To propagate or replace the error, throw from within the hook.
 *
 * @public
 */
export type OnNetworkErrorHook = (
  error: NetworkError | RetryRequestError,
  requestOptions: HttpRequestOptions,
  userOptions: DoLookupUserOptions
) => Promise<void>;

/**
 * Hooks for customizing the {@link PolarityRequest} lifecycle. All hook arrays
 * execute in order. `beforeRequest` and `afterResponse` hooks chain their output,
 * while error hooks run sequentially and can suppress errors by returning without
 * throwing.
 *
 * @public
 */
export interface PolarityRequestHooks {
  /**
   * Hooks that run before each HTTP request. Each hook receives a copy of the request
   * options and the return value is passed to the next hook (or used for the request).
   */
  beforeRequest?: BeforeRequestHook[];
  /**
   * Hooks that run after a successful HTTP response. Each hook receives the response
   * from the previous hook and the return value is passed to the next hook (or returned
   * to the caller).
   */
  afterResponse?: AfterResponseHook[];
  /**
   * Hooks that run when an API error is detected. Each hook receives the error and the
   * full HTTP response. If all hooks return without throwing, the error is suppressed.
   */
  onApiError?: OnApiErrorHook[];
  /**
   * Hooks that run when a network or rate-limiting error occurs. If all hooks return
   * without throwing, the error is suppressed.
   */
  onNetworkError?: OnNetworkErrorHook[];
}

/**
 * @public
 */
export interface PolarityRequestOptions {
  defaults?: ConfigRequestProxyOptions;
  isApiError?: IsApiErrorFunction;
  roundedSuccessStatusCodes?: number[];
  httpResponseErrorProperties?: string[];
  httpResponseErrorMessageProperties?: string[];
  requestOptionsToSanitize?: string[];
  hooks?: PolarityRequestHooks;
  limiter?: Bottleneck;
}

/**
 * A utility class for making HTTP requests
 * @public
 */
export class PolarityRequest {
  /**
   * Instance of a Bunyan logger
   */
  private logger;
  /**
   * postman-request library request object with default values set.  Used internally for
   * making HTTP requests directly via the postman-request library
   */
  private readonly requestWithDefaults: (
    requestOptions: HttpRequestOptions
  ) => Promise<HttpRequestResponse>;

  public readonly roundedSuccessStatusCodes: number[] = [200];
  /**
   * One or more HTTP response properties specified using JSON dot notation.  If the
   * specified path exists within the `body` property of the HTTP Response, an
   * ApiRequestError will be thrown.
   *
   * By default, this value is an empty array and response properties are not used to
   * detect errors.
   * @defaultValue []
   */
  public readonly httpResponseErrorProperties: string[] = [];
  /**
   * One or more HTTP response properties specified using JSON dot notation that
   * point to an error message that should be displayed to the user in the event
   * of an API error.
   *
   * The property should be a string value.  If the property does not exist or is not
   * a string value, a default error message will be used instead.
   */
  public readonly httpResponseErrorMessageProperties: string[] = [];
  /**
   * Optional method that can be implemented to determine if an API error
   * was encountered after an HTTP request is made.
   *
   * If the `isApiError` method is implemented
   * the property `roundedSuccessStatusCodes` and `httpResponseErrorProperties` are not
   * used to determine API errors.
   *
   * @returns An object indicating whether an API error was encountered and an optional message.
   */
  public readonly isApiError: IsApiErrorFunction = null;
  /**
   * An array of JSON dot notation paths to omit from the request options when logging.
   *
   * This property can be used to sanitize sensitive request properties that should not
   * appear in logging.
   *
   * Note that the `requestOptions` object is automatically sanitized to remove properties that
   * typically contain sensitive API key and passwords.  For a list of properties that are
   * automatically sanitized, see the {@link sanitizeRequestOptions} method.
   */
  public readonly requestOptionsToSanitize: string[] = [];
  public userOptions: DoLookupUserOptions = null;

  /**
   * An optional Bottleneck limiter instance used to throttle HTTP requests.
   * When set, all requests made via {@link PolarityRequest.run} are scheduled
   * through this limiter. Typically provided by the Polarity server via the
   * integration context.
   */
  public limiter: Bottleneck | null = null;

  /**
   * Lifecycle hooks for customizing request behavior. Hooks are configured via the
   * {@link PolarityRequestOptions.hooks} property when creating a new instance of the
   * {@link PolarityRequest} class.
   *
   * @see {@link PolarityRequestHooks} for hook type details.
   */
  public readonly hooks: Required<PolarityRequestHooks> = {
    beforeRequest: [],
    afterResponse: [],
    onApiError: [],
    onNetworkError: []
  };

  constructor(options: PolarityRequestOptions = {}) {
    const defaults = options.defaults || {};
    const {
      ca,
      cert,
      key,
      passphrase,
      proxy,
      rejectUnauthorized = true,
      json = true
    } = defaults;

    if (getLogger().child) {
      this.logger = getLogger().child({
        lib: 'polarity-integration-utils',
        module: 'PolarityRequest'
      });
    } else {
      this.logger = getLogger();
    }

    if (options.isApiError) {
      this.isApiError = options.isApiError;
    }

    if (options.roundedSuccessStatusCodes) {
      this.roundedSuccessStatusCodes = options.roundedSuccessStatusCodes;
    }

    if (options.httpResponseErrorMessageProperties) {
      this.httpResponseErrorMessageProperties =
        options.httpResponseErrorMessageProperties;
    }

    if (options.httpResponseErrorProperties) {
      this.httpResponseErrorProperties = options.httpResponseErrorProperties;
    }

    if (options.requestOptionsToSanitize) {
      this.requestOptionsToSanitize = options.requestOptionsToSanitize;
    }

    if (options.hooks) {
      const h = options.hooks;
      if (h.beforeRequest) this.hooks.beforeRequest = h.beforeRequest;
      if (h.afterResponse) this.hooks.afterResponse = h.afterResponse;
      if (h.onApiError) this.hooks.onApiError = h.onApiError;
      if (h.onNetworkError) this.hooks.onNetworkError = h.onNetworkError;
    }

    if (options.limiter) {
      this.limiter = options.limiter;
    }

    const defaultRequestOptions = {
      ...(this.configFieldIsValid(ca) && { ca: fs.readFileSync(ca) }),
      ...(this.configFieldIsValid(cert) && { cert: fs.readFileSync(cert) }),
      ...(this.configFieldIsValid(key) && { key: fs.readFileSync(key) }),
      ...(this.configFieldIsValid(passphrase) && { passphrase }),
      ...(this.configFieldIsValid(proxy) && { proxy }),
      ...(typeof rejectUnauthorized === 'boolean' && { rejectUnauthorized }),
      json
    };

    this.requestWithDefaults = promisify(request.defaults(defaultRequestOptions));
  }

  private configFieldIsValid = (field: string): boolean =>
    typeof field === 'string' && field.length > 0;

  /**
   * Makes a single HTTP request and returns the response or throws an error
   *
   * @param requestOptions - request options used to make the HTTP request
   * @returns The HTTP response
   */
  public async run(
    requestOptions: HttpRequestOptions
  ): Promise<HttpRequestResponse | undefined> | never {
    if (!this.userOptions) {
      throw new LibraryUsageError(
        'PolarityRequest property `userOptions` must be set before calling `run` method'
      );
    }

    // Run beforeRequest hooks — each receives previous hook's output
    let processedOptions: HttpRequestOptions = { ...requestOptions };
    for (const hook of this.hooks.beforeRequest) {
      const hookResult = await hook(processedOptions, this.userOptions);
      if (!hookResult || typeof hookResult !== 'object') {
        throw new LibraryUsageError(
          'Each `beforeRequest` hook must return an `HttpRequestOptions` object.'
        );
      }
      processedOptions = hookResult;
    }

    let httpResponse: HttpRequestResponse;

    try {
      httpResponse = await (this.limiter
        ? this.limiter.schedule(
            this.requestWithDefaults,
            processedOptions
          )
        : this.requestWithDefaults(processedOptions));
    } catch (requestError) {
      if (requestError instanceof LibraryUsageError) {
        throw requestError;
      }

      let transformedError: NetworkError | RetryRequestError;

      if (requestError instanceof Bottleneck.BottleneckError) {
        transformedError = new RetryRequestError(
          'This request has been dropped for going over Integration Configured API Throttling Limits',
          {
            requestOptions: processedOptions,
            requestOptionsToSanitize: this.requestOptionsToSanitize
          }
        );
      } else {
        transformedError = new NetworkError('Network error encountered during request', {
          cause: requestError,
          requestOptions: processedOptions,
          requestOptionsToSanitize: this.requestOptionsToSanitize
        });
      }

      if (this.hooks.onNetworkError.length > 0) {
        for (const hook of this.hooks.onNetworkError) {
          await hook(transformedError, processedOptions, this.userOptions);
        }
        return undefined;
      }

      throw transformedError;
    }

    if (this.limiter) {
      this.logger.trace({ httpResponse }, 'HTTP Response via Bottleneck');
    } else {
      this.logger.trace({ httpResponse }, 'HTTP Response');
    }

    // Check for API-level errors
    const apiError = this.detectApiError(httpResponse, processedOptions);

    if (apiError) {
      if (this.hooks.onApiError.length > 0) {
        for (const hook of this.hooks.onApiError) {
          await hook(apiError, httpResponse, processedOptions, this.userOptions);
        }
        return httpResponse;
      }
      throw apiError;
    }

    // Run afterResponse hooks — each receives previous hook's output
    let result = httpResponse;
    for (const hook of this.hooks.afterResponse) {
      const hookResult = await hook(result, processedOptions, this.userOptions);
      if (!hookResult || typeof hookResult !== 'object') {
        throw new LibraryUsageError(
          'Each `afterResponse` hook must return an `HttpRequestResponse` object.'
        );
      }
      result = hookResult;
    }

    return result;
  }

  /**
   * Checks whether the HTTP response is an API error and returns an ApiRequestError if it is.
   *
   * @param httpResponse - The HTTP response from the Postman request.
   * @param requestOptions - The options used for the request.
   * @returns An ApiRequestError if the response indicates an API error, undefined otherwise.
   *
   * @throws {@link LibraryUsageError}
   * Throws if the `isApiError` function returns an invalid result.
   */
  private detectApiError(
    httpResponse: HttpRequestResponse,
    requestOptions: HttpRequestOptions
  ): ApiRequestError | undefined {
    const { statusCode, body } = httpResponse;

    const requestOptionsWithoutSensitiveData = sanitizeRequestOptions(
      requestOptions,
      this.requestOptionsToSanitize
    );

    this.logger.trace(
      {
        requestOptions: requestOptionsWithoutSensitiveData,
        statusCode,
        responseBody: body
      },
      'Request ran, checking for status error'
    );

    let hasApiError: boolean;
    let message: string;
    if (this.isApiError) {
      const result: IsApiErrorResult = this.isApiError(
        httpResponse,
        requestOptions,
        this.userOptions
      );
      if (!result || typeof result.isApiError !== 'boolean') {
        throw new LibraryUsageError(
          'PolarityRequest property `isApiError` must return an object containing an `isApiError` property with a boolean value.  It can also optionally include a `message` property with a custom error message.'
        );
      }
      hasApiError = result.isApiError;
      message = result.message
        ? result.message
        : this.getErrorMessageFromHttpResponse(
            body,
            'Unexpected Error HTTP Response Received'
          );
    } else if (this.isHttpStatusCodeError(statusCode)) {
      hasApiError = true;
      message = this.getErrorMessageFromHttpResponse(
        body,
        `Unexpected HTTP Status Code ${statusCode} Received`
      );
    } else if (this.hasHttpResponseErrorProperty(body)) {
      hasApiError = true;
      message = this.getErrorMessageFromHttpResponse(
        body,
        'Unexpected Error HTTP Response Received'
      );
    }

    if (hasApiError) {
      return new ApiRequestError(message, {
        status: statusCode.toString(),
        requestOptions: requestOptionsWithoutSensitiveData,
        requestOptionsToSanitize: this.requestOptionsToSanitize,
        meta: {
          body
        }
      });
    }

    return undefined;
  }

  /**
   * Returns true if the `httpStatusCode` is not one of the rounded HTTP status codes
   * specified in the PolarityRequest `roundedSuccessStatusCodes` property.
   *
   * @param httpStatusCode - A numeric HTTP Status Code
   * @returns true if the provided `httpStatusCode` is an error code
   */
  private isHttpStatusCodeError(httpStatusCode: number): boolean {
    const roundedStatus = Math.round(httpStatusCode / 100) * 100;
    const statusCodeNotSuccessful =
      !this.roundedSuccessStatusCodes.includes(roundedStatus);
    return statusCodeNotSuccessful;
  }

  /**
   * Returns true indicating that the API returned an error  if the `httpBody` contains
   * one of the paths specified by the PolarityRequest `httpResponseErrorProperties`
   * property.
   *
   * @param httpBody - body property from the HttpRequestResponse
   * @returns `true` if the httpBody property contains properties specified in `httpResponseErrorProperties`
   */
  private hasHttpResponseErrorProperty(httpBody: unknown): boolean {
    return this.httpResponseErrorProperties.some((property) => has(httpBody, property));
  }

  /**
   * Returns an error message based on the `httpResponseErrorMessageProperties` first.  If no
   * message is found, it then uses the `httpResponseErrorProperties` to attempt to find
   * a suitable error message.  If no message is still found, the `defaultMessage` is returned.
   *
   * @param httpBody - JSON Object returned by an HTTP Request
   * @param defaultMessage - A default error message to use if no specific error messages are found
   * @returns An error message
   */
  private getErrorMessageFromHttpResponse(
    httpBody: unknown,
    defaultMessage: string
  ): string {
    let message = this.maybeGetStringPropertyValue(
      httpBody,
      this.httpResponseErrorMessageProperties
    );
    if (!message) {
      message = this.maybeGetStringPropertyValue(
        httpBody,
        this.httpResponseErrorProperties
      );
    }

    return message ? message : defaultMessage;
  }

  /**
   * Given a list of `properties` which are strings representing JSON dot notation, this
   * method returns the first string property found at the given JSON path
   * in the given `object`.
   *
   * @param object - An object to find properties in
   * @param properties - a list of JSON dot notation properties to look for within `object`
   * @returns A string value of the property found within the given object or undefined if no value is found
   */
  private maybeGetStringPropertyValue(
    object: unknown,
    properties: string[]
  ): string | undefined {
    let message: string | undefined;
    properties.some((property) => {
      if (has(object, property)) {
        const propertyValue = get(object, property);
        if (typeof propertyValue === 'string') {
          message = propertyValue;
          return true;
        }
      }
    });
    return message;
  }

  /**
   * Runs multiple requests in parallel with a limit on the maximum number of concurrent requests.
   *
   * When running multiple request at once it is often useful to be able to tie a specific request
   * back to the entity the request is for.  To support this, the `HttpRequestOptions` object accepts
   * an optional `entity` property which can be assigned to the Entity the request is being made for.
   * The `HttpRequestResponse` object returned by this method will include the same `entity` property
   * making it easy to match the response to the entity.
   *
   * Alternatively, for requests that are made for multiple entities at once (e.g., a query that can
   * search multiple entities at a time), the `HttpRequestOptions` object also has an `entities`
   * property which accept an array of entity objects.  Similar to the `entity`, the
   * `entities` property will be set on the `HttpRequestResponse` object.
   *
   * Finally, if you are looking to pass through a custom request id you can do that using the
   * `requestId` property.
   *
   * @param options - An array of request options for running requests in parallel.
   * @returns A promise that resolves to an array of responses.  If the `returnErrors` property is set to `true`
   * then the response objects will have their `error` property set to the thrown error.
   */
  public async runInParallel(
    options: RunInParallelOptions
  ): Promise<HttpRequestResponse[]> {
    const allRequestOptions = options.allRequestOptions;
    const returnErrors = options.returnErrors || false;
    const maxConcurrentRequests = options.maxConcurrentRequests || 5;

    if (!Array.isArray(allRequestOptions)) {
      throw new LibraryUsageError(
        'Invalid or missing option for PolarityRequest.runInParallel(): `allRequestOptions` is a required option and must be an array of `HttpRequestOptions` with at least one `HttpRequestOptions` object in it.'
      );
    }

    // REVIEW: We're currently supporting tying the entity to the request by using
    // the `entity` property, the `entities` property, or the generic `requestId` property.
    const tasks = allRequestOptions.map((requestOptions) => {
      return async () => {
        try {
          const response = await this.run(requestOptions);
          if (response) {
            if (requestOptions.entity) {
              response.entity = requestOptions.entity;
            } else if (requestOptions.entities) {
              response.entities = requestOptions.entities;
            } else if (requestOptions.requestId) {
              response.requestId = requestOptions.requestId;
            }
          }
          return response;
        } catch (requestError) {
          if (returnErrors) {
            return {
              error: requestError
            } as HttpRequestResponse;
          } else {
            throw requestError;
          }
        }
      };
    });

    const results: HttpRequestResponse[] = await parallelLimit(
      tasks,
      maxConcurrentRequests
    );

    return results;
  }
}
