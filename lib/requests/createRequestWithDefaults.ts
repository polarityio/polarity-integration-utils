import fs = require('fs');

import request from 'postman-request';
import { get, isEmpty, getOr, omit } from 'lodash/fp';
import Bottleneck from 'bottleneck';

import logging from '../logging';
import errors from '../errors';
import {
  CreateRequestFunctionArguments,
  PostprocessRequestFailureFunction,
  PostprocessRequestResponseFunction,
  PreprocessRequestOptionsFunction,
  RequestOptions,
  RequestWithDefaultsFunction
} from './types';

const _configFieldIsValid = (field) => typeof field === 'string' && field.length > 0;

let limiter;

function _setupLimiter(options) {
  limiter = new Bottleneck({
    maxConcurrent: options.maxConcurrentRequests
      ? Number.parseInt(options.maxConcurrentRequests, 10)
      : 10, // no more than 5 lookups can be running at single time
    highWater: 50, // no more than 50 lookups can be queued up
    strategy: Bottleneck.strategy.OVERFLOW,
    minTime: options.minimumMillisecondsRequestWillTake
      ? Number.parseInt(options.minimumMillisecondsRequestWillTake, 10)
      : 200
  });
}

/**
 * @param interface CreateRequestFunctionArguments {
 *   config?: type ConfigJs = {
 *     request: {
 *       ca?: string;
 *       cert?: string;
 *       key?: string;
 *       passphrase?: string;
 *       rejectUnauthorized?: string;
 *       proxy?: string;
 *       json?: boolean;
 *     };
 *   } | undefined;
 *     * The entire config.js(on) object
 *   roundedSuccessStatusCode?: number[];
 *     * Defaults: [200]
 *     * Status codes, rounded to the 100's place, that should not throw errors.
 *   useLimiter?: boolean;
 *     * Defaults: false
 *     * Set limit params in options (options.maxConcurrentRequests [default 10] & options.minimumMillisecondsRequestWillTake [default 200]) passed when
 *       using the RequestWithDefaultsFunction this function returns
 *       which can be hardcoded or can come from the userOptions directly
 *   requestOptionsToOmitFromLogsKeyPaths?: string[];
 *     * Defaults: ['headers.Authorization']
 *     * Key Paths on the Request Options you wish to not automatically log.
 *   preprocessRequestOptions?: type PreprocessRequestOptionsFunction =
 *     (requestOptions: RequestOptions) => Promise<object> | never | undefined;
 *   postprocessRequestResponse?: type PostprocessRequestResponseFunction =
 *     (response: any, requestOptions: RequestOptions) => Promise<any> | never | undefined;
 *   postprocessRequestFailure?: type PostprocessRequestFailureFunction =
 *     (error: Error, requestOptions: RequestOptions) => Promise<any> | never | undefined;
 * }
 * @returns type RequestWithDefaultsFunction = (requestOptions: RequestOptions) => Promise<any> | never
 *   * Returns an async request function with the proxy defaults included in the request options
 *   * type RequestOptions = {
 *       url?: string;
 *       headers?: object;
 *       qs?: object;
 *       options?: object;
 *       entity?: object;
 *       form?: object;
 *       [key: string]: any;
 *    }
};
 */
const createRequestWithDefaults = ({
  config: { request: { ca, cert, key, passphrase, rejectUnauthorized, proxy, json } } = {
    request: {
      ca: '',
      cert: '',
      key: '',
      passphrase: '',
      proxy: '',
      rejectUnauthorized: false,
      json: true
    }
  },
  roundedSuccessStatusCodes = [200],
  useLimiter = false,
  requestOptionsToOmitFromLogsKeyPaths = ['headers.Authorization'],
  preprocessRequestOptions = async (requestOptions: RequestOptions) => ({}),
  postprocessRequestResponse = async (response: any, requestOptions: RequestOptions) =>
    response,
  postprocessRequestFailure = async (error: Error, requestOptions: RequestOptions) => {
    throw error;
  }
}: CreateRequestFunctionArguments): RequestWithDefaultsFunction => {
  const defaultsProxyOptions = {
    ...(_configFieldIsValid(ca) && { ca: fs.readFileSync(ca) }),
    ...(_configFieldIsValid(cert) && { cert: fs.readFileSync(cert) }),
    ...(_configFieldIsValid(key) && { key: fs.readFileSync(key) }),
    ...(_configFieldIsValid(passphrase) && { passphrase }),
    ...(_configFieldIsValid(proxy) && { proxy }),
    ...(typeof rejectUnauthorized === 'boolean' && { rejectUnauthorized }),
    json
  };

  const requestDefaultsWithInterceptors = requestWithDefaultsBuilder(
    defaultsProxyOptions,
    roundedSuccessStatusCodes,
    useLimiter,
    requestOptionsToOmitFromLogsKeyPaths,
    preprocessRequestOptions,
    postprocessRequestResponse,
    postprocessRequestFailure
  );

  return requestDefaultsWithInterceptors;
};

export const requestWithDefaultsBuilder = (
  defaultsProxyOptions: object,
  roundedSuccessStatusCodes?: number[],
  useLimiter?: boolean,
  requestOptionsToOmitFromLogsKeyPaths?: string[],
  preprocessRequestOptions?: PreprocessRequestOptionsFunction,
  postprocessRequestResponse?: PostprocessRequestResponseFunction,
  postprocessRequestFailure?: PostprocessRequestFailureFunction
) => {
  const defaultsRequest = request.defaults(defaultsProxyOptions);

  const _requestWithDefaults = (requestOptions: RequestOptions) =>
    new Promise((resolve, reject) => {
      defaultsRequest(requestOptions, (err: any, res: any) => {
        if (err) return reject(err);
        resolve(res);
      });
    });

  return async (requestOptions: RequestOptions) => {
    if (useLimiter && !limiter) _setupLimiter(requestOptions.options);

    const preRequestFunctionResults = await preprocessRequestOptions(requestOptions);
    const _requestOptions = {
      ...requestOptions,
      ...preRequestFunctionResults
    };

    let postRequestFunctionResults, result;
    try {
      result = await (useLimiter
        ? limiter.schedule(_requestWithDefaults, _requestOptions)
        : _requestWithDefaults(_requestOptions));

      checkForStatusError(
        result,
        _requestOptions,
        roundedSuccessStatusCodes,
        requestOptionsToOmitFromLogsKeyPaths
      );

      postRequestFunctionResults = await postprocessRequestResponse(
        result,
        _requestOptions
      );
    } catch (error) {
      try {
        postRequestFunctionResults = await postprocessRequestFailure(
          error,
          _requestOptions
        );
      } catch (error) {
        const err = errors.parseErrorToReadableJson(error);

        if (useLimiter) {
          error.maxRequestQueueLimitHit =
            (isEmpty(err) && isEmpty(result)) ||
            (err &&
              (err.message ===
                'This job has been dropped by Bottleneck for going over API Limits' ||
                err instanceof Bottleneck.BottleneckError));

          error.isConnectionReset =
            getOr('', 'errors[0].meta.err.code', err) === 'ECONNRESET';
        }

        if (_requestOptions.entity) error.entity = JSON.stringify(_requestOptions.entity);

        throw error;
      }
    }
    return postRequestFunctionResults;
  };
};

const checkForStatusError = (
  { statusCode, body }: { statusCode?: number; body?: any },
  requestOptions: RequestOptions,
  roundedSuccessStatusCodes?: number[],
  requestOptionsToOmitFromLogsKeyPaths?: string[]
) => {
  const Logger = logging.getLogger();

  const requestOptionsWithoutSensitiveData = omit(
    requestOptionsToOmitFromLogsKeyPaths.concat('options'),
    requestOptions
  );

  Logger.trace({
    MESSAGE: 'Request Ran, Checking Status...',
    statusCode,
    requestOptions: requestOptionsWithoutSensitiveData,
    responseBody: body
  });

  const roundedStatus = Math.round(statusCode / 100) * 100;
  const statusCodeNotSuccessful = !roundedSuccessStatusCodes.includes(roundedStatus);
  const responseBodyError = get('error', body);

  if (statusCodeNotSuccessful || responseBodyError) {
    const message = get('message', responseBodyError);
    const status = statusCodeNotSuccessful ? statusCode : get('code', responseBodyError);
    const description = JSON.stringify(body);
    const requestOptions = JSON.stringify(requestOptionsWithoutSensitiveData);
    const requestError = new errors.RequestError(
      message,
      status,
      description,
      requestOptions
    );

    throw requestError;
  }
};

export default createRequestWithDefaults;
