import fs from 'fs';
import { promisify } from 'util';
import Bottleneck from 'bottleneck';
import request from 'postman-request';
import async from 'async';
import { isEqual, get, has } from 'lodash/fp';
import {
  ApiRequestError,
  NetworkError,
  RetryRequestError,
  LibraryUsageError
} from '../errors';
import { getLogger } from '../logging';

import type { DoLookupUserOptions } from '../user-options/types';
import type { Entity } from '../types';
import { sanitizeRequestOptions } from './sanitizeRequestOptions';

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
 * Optional middleware method for modifying {@link HttpRequestOptions} before a request is made
 * via the {@link PolarityRequest.run} method or {@link PolarityRequest.runInParallel} method.
 * The returned `requestOptions` object will be used for the request.  This method is passed
 * a copy of the original `requestOptions` object so it can be modified without side effects.
 *
 * This method is typically used for adding authentication (e.g., auth headers, or basic auth) to every request.  It can also
 * be used to add headers that are required on every request or conditionally add headers based
 * on the passed in `userOptions`.
 *
 * @public
 */
export type PreprocessRequestOptions = (
  requestOptions: HttpRequestOptions,
  userOptions: DoLookupUserOptions
) => Promise<HttpRequestOptions> | never | undefined;

/**
 * Optional middleware method for modifying the {@link HttpRequestResponse} after a successful request.
 * The passed in {@link HttpRequestResponse} object is not a copy but can be safely modified without
 * side effects.  The returned `HttpRequestResponse` object will be used for the response.
 *
 * @public
 */
export type PostprocessRequestSuccess = (
  response: HttpRequestResponse,
  requestOptions: HttpRequestOptions,
  userOptions: DoLookupUserOptions
) => Promise<HttpRequestResponse> | never;

/**
 * @public
 */
export type PostprocessRequestFailure = (
  error: Error,
  requestOptions: HttpRequestOptions,
  userOptions: DoLookupUserOptions
) => Promise<unknown> | never;

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
  preprocessRequestOptions?: PreprocessRequestOptions;
  postprocessRequestSuccess?: PostprocessRequestSuccess;
  postprocessRequestFailure?: PostprocessRequestFailure;
  throttlingOptions?: Bottleneck.ConstructorOptions;
}

/**
 * A utility class for making HTTP requests
 * @public
 */
export class PolarityRequest {
  private bottleneckLimiter;
  /**
   * Instance of a Bunyan logger
   */
  private logger;
  private internalThrottlingOptions: Bottleneck.ConstructorOptions;
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
   * Optional middleware method for modifying {@link HttpRequestOptions} before a request is made
   * via the {@link PolarityRequest.run} method or {@link PolarityRequest.runInParallel} method.
   * The returned `requestOptions` object will be used for the request.  This method is passed
   * a copy of the original `requestOptions` object so it can be modified without side effects.
   *
   * This method is typically used for adding authentication (e.g., auth headers, or basic auth) to every request.
   * It can also be used to add headers that are required on every request or conditionally add headers based
   * on the passed in `userOptions`.
   *
   * This method can be set as part of the {@link PolarityRequestOptions} when creating a new instance of the
   * {@link PolarityRequest} class or can be set after the fact.
   *
   * @param requestOptions - A copy of the request options used for the request.  This object can be modified
   * without side effects.
   * @param userOptions - The user options passed into the `doLookup` method.
   * @returns The modified request options to use for the request.
   */
  public preprocessRequestOptions: PreprocessRequestOptions = async (
    requestOptions: HttpRequestOptions,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    userOptions: DoLookupUserOptions
  ): Promise<HttpRequestOptions> => requestOptions;

  /**
   * Optional middleware method for modifying the {@link HttpRequestResponse} after a successful request.
   * The passed in {@link HttpRequestResponse} object is not a copy but can be safely modified without
   * side effects.  The returned `HttpRequestResponse` object will be used for the response.
   *
   * @param response - The HTTP response from the request.
   * @param requestOptions - The request options used for the request.
   * @param userOptions - The user options passed into the `doLookup` method.
   */
  public postprocessRequestSuccess: PostprocessRequestSuccess = async (
    response: HttpRequestResponse,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    requestOptions: HttpRequestOptions,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    userOptions: DoLookupUserOptions
  ): Promise<HttpRequestResponse> => response;

  /**
   * Method that can be implemented to post-process the HTTP response after a failed request.
   * This method is typically used to inspect the error thrown and either alter the error
   * object (e.g., to change the error message property to something more specific), to ignore
   * the error (by not rethrowing it), or to take a specific action based on the error (e.g.,
   * in the case of a RetryRequestError you may want to retry the request or return a special
   * payload to the integration front end).
   *
   * @param error - The error thrown during the request.
   * @param requestOptions - The request options used for the request.
   * @param userOptions - The user options passed into the `doLookup` method.
   */
  public postprocessRequestFailure: PostprocessRequestFailure = (
    error: Error,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    requestOptions: HttpRequestOptions,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    userOptions: DoLookupUserOptions
  ): never => {
    throw error;
  };

  public get throttlingOptions(): Bottleneck.ConstructorOptions {
    return this.internalThrottlingOptions;
  }

  // REVIEW: Do we want to tie our throttling specifically to Bottleneck or do we want to make
  // it more generic and independent of Bottleneck?
  public set throttlingOptions(throttlingOptions: Bottleneck.ConstructorOptions) {
    if (isEqual(this.internalThrottlingOptions, throttlingOptions)) return;

    this.bottleneckLimiter = new Bottleneck({
      ...throttlingOptions,
      maxConcurrent:
        typeof throttlingOptions.maxConcurrent === 'string'
          ? Number.parseInt(throttlingOptions.maxConcurrent, 10)
          : throttlingOptions.maxConcurrent,
      minTime:
        typeof throttlingOptions.minTime === 'string'
          ? Number.parseInt(throttlingOptions.minTime, 10)
          : throttlingOptions.minTime,
      highWater: throttlingOptions.highWater || 50,
      strategy: throttlingOptions.strategy || Bottleneck.strategy.OVERFLOW
    });

    this.internalThrottlingOptions = throttlingOptions;
  }

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

    if (options.postprocessRequestFailure) {
      this.postprocessRequestFailure = options.postprocessRequestFailure;
    }

    if (options.postprocessRequestSuccess) {
      this.postprocessRequestSuccess = options.postprocessRequestSuccess;
    }

    if (options.preprocessRequestOptions) {
      this.preprocessRequestOptions = options.preprocessRequestOptions;
    }

    if (options.throttlingOptions) {
      this.throttlingOptions = options.throttlingOptions;
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
  ): Promise<HttpRequestResponse> | never {
    if (!this.userOptions) {
      throw new LibraryUsageError(
        'PolarityRequest property `userOptions` must be set before calling `run` method'
      );
    }

    // Note that we specifically pass a copy of requestOptions to `preprocessRequestOptions`
    // which lets the user modify the requestOptions object without affecting the original
    const postprocessedRequestOptions = await this.preprocessRequestOptions(
      {
        ...requestOptions
      },
      this.userOptions
    );

    let postprocessRequestResults: HttpRequestResponse;

    try {
      const httpResponse = await (this.bottleneckLimiter
        ? this.bottleneckLimiter.schedule(
            this.requestWithDefaults,
            postprocessedRequestOptions
          )
        : this.requestWithDefaults(postprocessedRequestOptions));

      if (this.bottleneckLimiter) {
        this.logger.trace({ httpResponse }, 'HTTP Response via Bottleneck');
      } else {
        this.logger.trace({ httpResponse }, 'HTTP Response');
      }

      this.maybeThrowApiRequestError(httpResponse, postprocessedRequestOptions);

      postprocessRequestResults = await this.postprocessRequestSuccess(
        httpResponse,
        postprocessedRequestOptions,
        this.userOptions
      );
    } catch (requestError) {
      let transformedError = requestError;

      if (requestError instanceof LibraryUsageError) {
        throw requestError;
      }

      if (!(requestError instanceof ApiRequestError)) {
        transformedError = new NetworkError('Network error encountered during request', {
          cause: requestError,
          requestOptions: postprocessedRequestOptions,
          requestOptionsToSanitize: this.requestOptionsToSanitize
        });
      }

      if (requestError instanceof Bottleneck.BottleneckError) {
        transformedError = new RetryRequestError(
          'This request has been dropped for going over Integration Configured API Throttling Limits',
          {
            requestOptions: postprocessedRequestOptions,
            requestOptionsToSanitize: this.requestOptionsToSanitize
          }
        );
      }

      // Possibly throws an error
      await this.postprocessRequestFailure(
        transformedError,
        postprocessedRequestOptions,
        this.userOptions
      );
    }

    return postprocessRequestResults;
  }

  /**
   * Checks whether the HTTP response is an API error and throws an ApiRequestError if it is.
   *
   * @param httpResponse - The HTTP response from the Postman request.
   * @param requestOptions - The options used for the request.
   *
   * @throws {@link ApiRequestError}
   * Throws an error if the response indicates an API error.
   */
  private maybeThrowApiRequestError(
    httpResponse: HttpRequestResponse,
    requestOptions: HttpRequestOptions
  ): void {
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
      throw new ApiRequestError(message, {
        status: statusCode.toString(),
        requestOptions: requestOptionsWithoutSensitiveData,
        requestOptionsToSanitize: this.requestOptionsToSanitize,
        meta: {
          body
        }
      });
    }
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
    return this.httpResponseErrorProperties.some((property) => has(property, httpBody));
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
      if (has(property, object)) {
        const propertyValue = get(property, object);
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

    // REVIEW: We're currently supporting tying the entity to the request by using
    // the `entity` property, the `entities` property, or the generic `requestId` property.
    const tasks = allRequestOptions.map((requestOptions) => {
      return async () => {
        try {
          const response = await this.run(requestOptions);
          if (requestOptions.entity) {
            response.entity = requestOptions.entity;
          } else if (requestOptions.entities) {
            response.entities = requestOptions.entities;
          } else if (requestOptions.requestId) {
            response.requestId = requestOptions.requestId;
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

    const results: HttpRequestResponse[] = await async.parallelLimit(
      tasks,
      maxConcurrentRequests
    );

    return results;
  }
}
