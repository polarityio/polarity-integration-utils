import { DoLookupUserOptions } from "../user-options/types";

export type ConfigRequestProxyOptions = {
  ca?: undefined | string;
  cert?: undefined | string;
  key?: undefined | string;
  passphrase?: undefined | string;
  rejectUnauthorized?: undefined | boolean;
  proxy?: undefined | string;
  json?: undefined | boolean;
};

export type ConfigJs = { request: ConfigRequestProxyOptions };

export type RequestOptions = {
  url?: string;
  headers?: object;
  qs?: object;
  options?: object;
  entity?: object;
  form?: object;
  [key: string]: unknown;
};

export type PreprocessRequestOptions = (
  userOptions: DoLookupUserOptions,
  requestOptions: RequestOptions
) => Promise<RequestOptions> | never | undefined;

export type PostprocessRequestSuccess = (
  response: unknown,
  requestOptions: RequestOptions,
  userOptions: DoLookupUserOptions
) => Promise<unknown> | never;

export type PostprocessRequestFailure = (
  error: Error,
  requestOptions: RequestOptions,
  userOptions: DoLookupUserOptions
) => Promise<unknown> | never;

export type PreprocessRequestOptionsFunction = (
  requestOptions: RequestOptions
) => Promise<object> | never | undefined;

export type PostprocessRequestResponseFunction = (
  response: unknown,
  requestOptions: RequestOptions
) => Promise<unknown> | never;

export type PostprocessRequestFailureFunction = (
  error: Error,
  requestOptions: RequestOptions
) => Promise<unknown> | never;

export interface RequestDefaults {
  defaults?: ConfigRequestProxyOptions;
  roundedSuccessStatusCodes?: number[];
  requestOptionsToOmitFromLogsKeyPaths?: string[];
}
export interface CreateRequestFunctionArguments {
  config?: ConfigJs;
  roundedSuccessStatusCodes?: number[];
  useLimiter?: boolean;
  requestOptionsToOmitFromLogsKeyPaths?: string[];
  preprocessRequestOptions?: PreprocessRequestOptionsFunction;
  postprocessRequestResponse?: PostprocessRequestResponseFunction;
  postprocessRequestFailure?: PostprocessRequestFailureFunction;
}

export type AnyPromiseResponse = Promise<unknown> | Error | never;

export type RequestWithDefaultsFunction = (
  requestOptions: RequestOptions
) => AnyPromiseResponse;
