import Bottleneck from 'bottleneck';
import fs from 'fs';
import request from 'postman-request';
import { isEqual, isEmpty, get, getOr, omit, map } from 'lodash/fp';

import { DoLookupUserOptions } from '../user-options/types';
import {
  PostprocessRequestFailure,
  PostprocessRequestSuccess,
  PreprocessRequestOptions,
  RequestDefaults,
  RequestOptions
} from './types';
import errors from '../errors';
import logging from '../logging';
import helpers from '../helpers';

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

class PolarityRequestWithDefaults implements RequestWithDefaults {
  private roundedSuccessStatusCodes: number[] = [200];
  private requestOptionsToOmitFromLogsKeyPaths: string[];
  public userOptions: DoLookupUserOptions;
  private bottleneckOptions: Bottleneck.ConstructorOptions;
  private bottleneckLimiter;

  private requestWithDefaults: (requestOptions: RequestOptions) => Promise<any>;
  private preprocessRequestOptions: PreprocessRequestOptions = async (
    userOptions: DoLookupUserOptions,
    requestOptions: RequestOptions
  ): Promise<RequestOptions> => requestOptions;
  private postprocessRequestSuccess: PostprocessRequestSuccess = async (
    response: any,
    requestOptions: RequestOptions,
    userOptions: DoLookupUserOptions
  ): Promise<any> => response;
  private postprocessRequestFailure: PostprocessRequestFailure = (
    error: Error,
    requestOptions: RequestOptions,
    userOptions: DoLookupUserOptions
  ): never => {
    throw error;
  };

  constructor({
    defaults: { ca, cert, key, passphrase, proxy, rejectUnauthorized, json },
    roundedSuccessStatusCodes,
    requestOptionsToOmitFromLogsKeyPaths
  }: RequestDefaults) {
    this.roundedSuccessStatusCodes = roundedSuccessStatusCodes;
    this.requestOptionsToOmitFromLogsKeyPaths = requestOptionsToOmitFromLogsKeyPaths;

    const defaultsProxyOptions = {
      ...(this.configFieldIsValid(ca) && { ca: fs.readFileSync(ca) }),
      ...(this.configFieldIsValid(cert) && { cert: fs.readFileSync(cert) }),
      ...(this.configFieldIsValid(key) && { key: fs.readFileSync(key) }),
      ...(this.configFieldIsValid(passphrase) && { passphrase }),
      ...(this.configFieldIsValid(proxy) && { proxy }),
      ...(typeof rejectUnauthorized === 'boolean' && { rejectUnauthorized }),
      json
    };
    const defaultsRequest = request.defaults(defaultsProxyOptions);

    this.requestWithDefaults = async (requestOptions: RequestOptions) =>
      new Promise((resolve, reject) => {
        defaultsRequest(requestOptions, (err: any, res: any) => {
          if (err) return reject(err);
          resolve(res);
        });
      });
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
    if (!isEqual(this.bottleneckOptions, bottleneckOptions)) return;

    this.bottleneckLimiter = new Bottleneck({
      ...bottleneckOptions,
      maxConcurrent:
        typeof bottleneckOptions.maxConcurrent === 'string'
          ? Number.parseInt(bottleneckOptions.maxConcurrent, 10)
          : bottleneckOptions.minTime,
      minTime:
        typeof bottleneckOptions.minTime === 'string'
          ? Number.parseInt(bottleneckOptions.minTime, 10)
          : bottleneckOptions.minTime,
      highWater: bottleneckOptions.minTime || 50,
      strategy: bottleneckOptions.strategy || Bottleneck.strategy.OVERFLOW
    });
  }

  public async run(requestOptions: RequestOptions): Promise<any> | never {
    const preRequestFunctionResults = await this.preprocessRequestOptions(
      this.userOptions,
      requestOptions
    );
    const _requestOptions = {
      ...requestOptions,
      ...preRequestFunctionResults
    };

    let postRequestFunctionResults, result;
    try {
      result = await (this.bottleneckLimiter
        ? this.bottleneckLimiter.schedule(this.requestWithDefaults, _requestOptions)
        : this.requestWithDefaults(_requestOptions));

      this.checkForStatusError(result, _requestOptions);

      postRequestFunctionResults = await this.postprocessRequestSuccess(
        result,
        _requestOptions,
        this.userOptions
      );
    } catch (error) {
      try {
        postRequestFunctionResults = await this.postprocessRequestFailure(
          error,
          _requestOptions,
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

        if (_requestOptions.entity) error.entity = JSON.stringify(_requestOptions.entity);

        throw error;
      }
    }
    return postRequestFunctionResults;
  }

  private checkForStatusError(
    { statusCode, body }: { statusCode?: number; body?: any },
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

  public async runInParallel(
    allRequestsOptions: RequestOptions[],
    responseGetPath: string = 'body',
    possibleSimultaneousRequests: number = 10,
    returnErrors: boolean = false
  ) {
    const unexecutedRequestFunctions = map(
      ({ resultId, ...requestOptions }) =>
        async () => {
          const response = await this.run(requestOptions);
          const result = responseGetPath ? get(responseGetPath, response) : response;
          return resultId ? { resultId, result } : result;
        },
      allRequestsOptions
    );

    const results = await helpers.parallelLimit(
      unexecutedRequestFunctions,
      possibleSimultaneousRequests,
      returnErrors
    );

    return results;
  }
}

export default PolarityRequestWithDefaults;
