import { DoLookupUserOptions } from '../user-options/types';

export type ConfigRequestProxyOptions = {
  ca?: undefined | string;
  cert?: undefined | string;
  key?: undefined | string;
  passphrase?: undefined | string;
  rejectUnauthorized?: undefined | boolean;
  proxy?: undefined | string;
  json?: undefined | boolean;
};

export type RequestOptions = {
  url?: string;
  headers?: object;
  qs?: object;
  entity?: object;
  form?: object;
  auth:
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
};

export type RunInParallelOptions = {
  allRequestOptions: RequestOptions[];
  maxConcurrentRequests?: number;
  returnErrors?: boolean;
};

export type PostmanRequestResponse = {
  statusCode: number;
  request: {
    uri: unknown;
    method: string;
    headers: unknown;
    [key: string]: unknown;
  };
  body: unknown;
  error?: Error;
  [key: string]: unknown;
};

export type IsApiErrorResult = {
  isApiError: boolean;
  message?: string;
};

export type IsApiErrorFunction = (
  status: number,
  body: unknown,
  response: unknown,
  requestOptions: RequestOptions
) => IsApiErrorResult;

export type PreprocessRequestOptions = (
  userOptions: DoLookupUserOptions,
  requestOptions: RequestOptions
) => Promise<RequestOptions> | never | undefined;

export type PostprocessRequestSuccess = (
  response: unknown,
  requestOptions: RequestOptions,
  userOptions: DoLookupUserOptions
) => Promise<PostmanRequestResponse> | never;

export type PostprocessRequestFailure = (
  error: Error,
  requestOptions: RequestOptions,
  userOptions: DoLookupUserOptions
) => Promise<unknown> | never;

export interface PolarityRequestOptions {
  defaults?: ConfigRequestProxyOptions;
  isApiError?: IsApiErrorFunction;
  roundedSuccessStatusCodes?: number[];
  httpResponseErrorProperties?: string[];
  httpResponseErrorMessageProperties?: string[];
  requestOptionsToOmitFromLogsKeyPaths?: string[];
}