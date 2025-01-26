import fs from 'fs';
import { promisify } from 'util';
import Bottleneck from 'bottleneck';
import request from 'postman-request';
import async from 'async';
import { isEqual, get, omit, has } from 'lodash/fp';
import {
  ApiRequestError,
  IntegrationError,
  NetworkError,
  RetryRequestError
} from '../errors';
import { getLogger } from '../logging';

import type { DoLookupUserOptions } from '../user-options/types';
import {
  PolarityRequestOptions,
  PostprocessRequestFailure,
  PostprocessRequestSuccess,
  PreprocessRequestOptions,
  RequestOptions,
  IsApiErrorFunction,
  IsApiErrorResult,
  PostmanRequestResponse,
  RunInParallelOptions
} from './types';

class PolarityRequest {
  private bottleneckLimiter;
  /**
   * Instance of a Bunyan logger
   * @private
   */
  private logger;
  private internalThrottlingOptions: Bottleneck.ConstructorOptions;
  /**
   * postman-request library request object with default values set.  Used internally for
   * making HTTP requests directly via the postman-request library
   * @private
   */
  private readonly requestWithDefaults: (
    requestOptions: RequestOptions
  ) => Promise<unknown>;

  public readonly roundedSuccessStatusCodes: number[] = [200];
  /**
   * One or more HTTP response properties specified using JSON dot notation.  If the
   * specified path exists within the `body` property of the HTTP Response, an
   * ApiRequestError will be thrown.
   *
   * By default, this value is an empty array and response properties are not used to
   * detect errors.
   * @default []
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
   * @param {number} status - The HTTP status code of the response.
   * @param {unknown} body - The body of the HTTP response.
   * @param {unknown} response - The full HTTP response object.
   * @param {RequestOptions} requestOptions - The options used for the request.
   * @returns {IsApiErrorResult} - An object indicating whether an API error was encountered and an optional message.
   */
  public readonly isApiError: IsApiErrorFunction = null;
  public readonly requestOptionsToOmitFromLogsKeyPaths: string[] = [];
  public userOptions: DoLookupUserOptions = null;

  public preprocessRequestOptions: PreprocessRequestOptions = async (
    userOptions: DoLookupUserOptions,
    requestOptions: RequestOptions
  ): Promise<RequestOptions> => requestOptions;

  public postprocessRequestSuccess: PostprocessRequestSuccess = async (
    response: PostmanRequestResponse,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    requestOptions: RequestOptions,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    userOptions: DoLookupUserOptions
  ): Promise<PostmanRequestResponse> => response;

  public postprocessRequestFailure: PostprocessRequestFailure = (
    error: Error,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    requestOptions: RequestOptions,
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

    this.logger = getLogger().child({
      lib: 'polarity-integration-utils',
      module: 'PolarityRequest'
    });

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

    if (options.requestOptionsToOmitFromLogsKeyPaths) {
      this.requestOptionsToOmitFromLogsKeyPaths =
        options.requestOptionsToOmitFromLogsKeyPaths;
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

  public async run(
    requestOptions: RequestOptions
  ): Promise<PostmanRequestResponse> | never {
    if (!this.userOptions) {
      throw new IntegrationError(
        'PolarityRequest property `userOptions` must be set before calling `run` method'
      );
    }

    const preRequestFunctionResults = await this.preprocessRequestOptions(
      this.userOptions,
      requestOptions
    );

    // REVIEW: Why do we want to merge here?  What if on a certain preprocess you wanted to remove
    // requestOptions, this would just put them back in.  Is that a realistic need?
    //
    // Would it be more expected if the preprocessRequestOptions was meant to return the
    // full requestOptions payload?
    const mergedRequestOptions = {
      ...requestOptions,
      ...preRequestFunctionResults
    };

    let postprocessRequestResults: PostmanRequestResponse;

    try {
      const httpResponse = await (this.bottleneckLimiter
        ? this.bottleneckLimiter.schedule(this.requestWithDefaults, mergedRequestOptions)
        : this.requestWithDefaults(mergedRequestOptions));

      if (this.bottleneckLimiter) {
        this.logger.trace({ httpResponse }, 'HTTP Response via Bottleneck');
      } else {
        this.logger.trace({ httpResponse }, 'HTTP Response');
      }

      this.maybeThrowApiRequestError(httpResponse, mergedRequestOptions);

      postprocessRequestResults = await this.postprocessRequestSuccess(
        httpResponse,
        mergedRequestOptions,
        this.userOptions
      );
    } catch (requestError) {
      let transformedError = requestError;

      // This is actually a framework usage error
      // TODO: Add a new error type for this
      if (requestError instanceof IntegrationError) {
        throw requestError;
      }

      if (!(requestError instanceof ApiRequestError)) {
        transformedError = new NetworkError('Network error encountered during request', {
          cause: requestError,
          requestOptions: mergedRequestOptions
        });
      }

      if (requestError instanceof Bottleneck.BottleneckError) {
        transformedError = new RetryRequestError(
          'This request has been dropped for going over Integration Configured API Throttling Limits',
          {
            requestOptions: mergedRequestOptions
          }
        );
      }

      // Possibly throws an error
      await this.postprocessRequestFailure(
        transformedError,
        mergedRequestOptions,
        this.userOptions
      );
    }

    return postprocessRequestResults;
  }

  /**
   * Checks whether the HTTP response is an API error and throws an ApiRequestError if it is.
   * @param {PostmanRequestResponse} httpResponse - The HTTP response from the Postman request.
   * @param {RequestOptions} requestOptions - The options used for the request.
   * @throws {ApiRequestError} - Throws an error if the response indicates an API error.
   * @private
   */
  private maybeThrowApiRequestError(
    httpResponse: PostmanRequestResponse,
    requestOptions: RequestOptions
  ): void {
    const { statusCode, body } = httpResponse;

    const requestOptionsWithoutSensitiveData = omit(
      this.requestOptionsToOmitFromLogsKeyPaths.concat('options'),
      requestOptions
    ) as RequestOptions;

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
      const result: IsApiErrorResult = this.isApiError(statusCode, body, httpResponse, requestOptions);
      if (!result || typeof result.isApiError !== 'boolean') {
        throw new IntegrationError(
          'PolarityRequest property `isApiError` must return an object containing an `isApiError` property with a boolean value'
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
        meta: {
          body
        }
      });
    }
  }

  /**
   * Returns true if the `httpStatusCode` is not one of the rounded HTTP status codes
   * specified in the PolarityRequest `roundedSuccessStatusCodes` property.
   * @private
   * @param {number} httpStatusCode A numeric HTTP Status Code 
   * @returns {boolean} true if the provided `httpStatusCode` is an error code
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
   * @private
   * @param {PostmanRequestResponse} httpBody body property from the PostmanRequestResponse
   * @returns {boolean} true if the httpBody property contains properties specified in `httpResponseErrorProperties` 
   */
  private hasHttpResponseErrorProperty(httpBody: unknown): boolean {
    return this.httpResponseErrorProperties.some((property) => has(property, httpBody));
  }

  /**
   * Returns an error message based on the `httpResponseErrorMessageProperties` first.  If no
   * message is found, it then uses the `httpResponseErrorProperties` to attempt to find
   * a suitable error message.  If no message is still found, the `defaultMessage` is returned.
   * @private
   * @param {unknown} httpBody JSON Object returned by an HTTP Request
   * @param {string} defaultMessage A default error message to use if no specific error messages are found
   * @returns {string} An error message
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
   * @private
   * @param {object} object - An object to find properties in
   * @param {string[]} properties - a list of JSON dot notation properties to look for within `object`
   * @returns {string|undefined} A string value of the property found within the given object or undefined if no value is found 
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
   * @param {RunInParallelOptions} options - The options for running requests in parallel.
   * @param {RequestOptions[]} options.allRequestOptions - An array of request options for each request to be run.
   * @param {boolean} [options.returnErrors=false] - Whether to return errors in the results array.
   * @param {number} [options.maxConcurrentRequests=5] - The maximum number of concurrent requests to run.
   * @returns {Promise<PostmanRequestResponse[]>} - A promise that resolves to an array of responses or errors.
   */
  public async runInParallel(
    options: RunInParallelOptions
  ): Promise<PostmanRequestResponse[]> {
    const allRequestOptions = options.allRequestOptions;
    const returnErrors = options.returnErrors || false;
    const maxConcurrentRequests = options.maxConcurrentRequests || 5;

    //TODO: Need to figure out how we want to make it easy for someone calling this function to 
    // match the request to the resule
    const tasks = allRequestOptions.map(async (requestOptions) => {
      try {
        return await this.run(requestOptions);
      } catch (requestError) {
        if (returnErrors) {
          return {
            error: requestError
          };
        }
      }
    });

    const results = await async.parallelLimit(tasks, maxConcurrentRequests);

    return results;
  }
}

export default PolarityRequest;
