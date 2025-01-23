import fs from 'fs';
import { promisify } from 'util';
import Bottleneck from 'bottleneck';
import request from 'postman-request';
import { isEqual, isEmpty, get, getOr, omit, map } from 'lodash/fp';
import errors from '../errors';
import logging from '../logging';
import helpers from '../helpers';

import type { DoLookupUserOptions } from '../user-options/types';
import {
  PolarityRequestOptions,
  PostprocessRequestFailure,
  PostprocessRequestSuccess,
  PreprocessRequestOptions,
  RequestOptions
} from './types';

interface RequestWithDefaults {
  setPreprocessRequestOptions(preprocessRequestOptions: PreprocessRequestOptions): void;

  setPostprocessRequestSuccess(
    postprocessRequestSuccess: PostprocessRequestSuccess
  ): void;

  setPostprocessRequestFailure(
    postprocessRequestFailure: PostprocessRequestFailure
  ): void;

  setUserOptions(userOptions: DoLookupUserOptions): void;
}

class PolarityRequest implements RequestWithDefaults {
  public readonly roundedSuccessStatusCodes: number[] = [200];
  public readonly requestOptionsToOmitFromLogsKeyPaths: string[] = [];
  public readonly userOptions: DoLookupUserOptions;
  public readonly bottleneckOptions: Bottleneck.ConstructorOptions;
  private bottleneckLimiter;
  private readonly requestWithDefaults: (
    requestOptions: RequestOptions
  ) => Promise<unknown>;
  private preprocessRequestOptions: PreprocessRequestOptions = async (
    userOptions: DoLookupUserOptions,
    requestOptions: RequestOptions
  ): Promise<RequestOptions> => requestOptions;
  private postprocessRequestSuccess: PostprocessRequestSuccess = async (
    response: unknown,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    requestOptions: RequestOptions,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    userOptions: DoLookupUserOptions
  ): Promise<unknown> => response;
  private postprocessRequestFailure: PostprocessRequestFailure = (
    error: Error,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    requestOptions: RequestOptions,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    userOptions: DoLookupUserOptions
  ): never => {
    throw error;
  };

  // REVIEW: I think `defaults` should be optional.  As a result, we should not
  // destructure in the function declaration and move this into the function body.
  // roundedSuccessStatusCodes and requestOptionsToOmitFromLogsKeypaths should
  // also be optional and default to their declared defaults
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

    if (options.roundedSuccessStatusCodes) {
      this.roundedSuccessStatusCodes = options.roundedSuccessStatusCodes;
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

  public setPreprocessRequestOptions(
    preprocessRequestOptions: PreprocessRequestOptions
  ): void {
    this.preprocessRequestOptions = preprocessRequestOptions;
  }

  public setPostprocessRequestSuccess(
    postprocessRequestSuccess: PostprocessRequestSuccess
  ): void {
    this.postprocessRequestSuccess = postprocessRequestSuccess;
  }

  public setPostprocessRequestFailure(
    postprocessRequestFailure: PostprocessRequestFailure
  ): void {
    this.postprocessRequestFailure = postprocessRequestFailure;
  }

  public setUserOptions(userOptions: DoLookupUserOptions): void {
    this.userOptions = userOptions;
  }

  public setLimiter(bottleneckOptions: Bottleneck.ConstructorOptions): void {
    if (isEqual(this.bottleneckOptions, bottleneckOptions)) return;

    this.bottleneckLimiter = new Bottleneck({
      ...bottleneckOptions,
      maxConcurrent:
        typeof bottleneckOptions.maxConcurrent === 'string'
          ? Number.parseInt(bottleneckOptions.maxConcurrent, 10)
          : bottleneckOptions.maxConcurrent,
      minTime:
        typeof bottleneckOptions.minTime === 'string'
          ? Number.parseInt(bottleneckOptions.minTime, 10)
          : bottleneckOptions.minTime,
      highWater: bottleneckOptions.minTime || 50,
      strategy: bottleneckOptions.strategy || Bottleneck.strategy.OVERFLOW
    });
  }

  public async run(requestOptions: RequestOptions): Promise<unknown> | never {
    const preRequestFunctionResults = await this.preprocessRequestOptions(
      this.userOptions,
      requestOptions
    );
    const mergedRequestOptions = {
      ...requestOptions,
      ...preRequestFunctionResults
    };

    let postRequestFunctionResults, result;
    try {
      result = await (this.bottleneckLimiter
        ? this.bottleneckLimiter.schedule(this.requestWithDefaults, mergedRequestOptions)
        : this.requestWithDefaults(mergedRequestOptions));

      logging.getLogger().trace({ result }, 'Internal Library Result');
      this.checkForStatusError(result, mergedRequestOptions);

      postRequestFunctionResults = await this.postprocessRequestSuccess(
        result,
        mergedRequestOptions,
        this.userOptions
      );
    } catch (error) {
      try {
        postRequestFunctionResults = await this.postprocessRequestFailure(
          error,
          mergedRequestOptions,
          this.userOptions
        );
      } catch (error) {
        //TODO incorporate Eds error handling
        const err = errors.parseErrorToReadableJson(error);

        if (this.bottleneckLimiter) {
          error.maxRequestQueueLimitHit =
            (isEmpty(err) && isEmpty(result)) ||
            (err &&
              (err.message ===
                'This job has been dropped by Bottleneck for going over API Limits' ||
                err instanceof Bottleneck.BottleneckError));

          error.isConnectionReset =
            getOr('', 'errors[0].meta.err.code', err) === 'ECONNRESET';
        }

        if (mergedRequestOptions.entity)
          error.entity = JSON.stringify(mergedRequestOptions.entity);

        throw error;
      }
    }
    return postRequestFunctionResults;
  }

  private checkForStatusError(
    { statusCode, body }: { statusCode?: number; body?: unknown },
    requestOptions: RequestOptions
  ): void {
    //TODO incorporate Eds error handling

    const Logger = logging.getLogger();

    const requestOptionsWithoutSensitiveData = omit(
      this.requestOptionsToOmitFromLogsKeyPaths.concat('options'),
      requestOptions
    );

    Logger.trace({
      MESSAGE: 'Request Ran, Checking Status...',
      statusCode,
      requestOptions: requestOptionsWithoutSensitiveData,
      responseBody: body
    });

    const roundedStatus = Math.round(statusCode / 100) * 100;
    const statusCodeNotSuccessful =
      !this.roundedSuccessStatusCodes.includes(roundedStatus);
    const responseBodyError = get('error', body);

    if (statusCodeNotSuccessful || responseBodyError) {
      const message = get('message', responseBodyError);
      const status = statusCodeNotSuccessful
        ? statusCode
        : get('code', responseBodyError);
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
  }

  // REVIEW: Constructor uses a config object as a single parameter
  // but this function takes multiple parameters.  Should we be consistent?
  // Any reason to do one or the other?
  public async runInParallel(
    allRequestsOptions: RequestOptions[],
    responseGetPath: string = 'body',
    maxConcurrentRequests: number = 10,
    returnErrors: boolean = false
  ) {
    const Logger = logging.getLogger();
    const unexecutedRequestFunctions = map(
      // REVIEW: Would it be better to just pass through the entire entity rather
      // than a resultId?
      ({ resultId, ...requestOptions }) =>
        async () => {
          Logger.trace({ requestOptions }, 'Parallel request options');
          const response = await this.run(requestOptions);
          const result = responseGetPath ? get(responseGetPath, response) : response;
          // REVIEW: The shape of the response object should stay the same rather than
          // change if a resultId is added or removed.  Otherwise, if you have to add a
          // result object later on, things will break and potentially cause cascading
          // issues.
          return resultId ? { resultId, result } : result;
        },
      allRequestsOptions
    );

    const results = await helpers.parallelLimit(
      unexecutedRequestFunctions,
      maxConcurrentRequests,
      returnErrors
    );

    return results;
  }
}

export default PolarityRequest;
