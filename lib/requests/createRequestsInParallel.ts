import { map, get } from 'lodash/fp';
import {
  AnyPromiseResponse,
  RequestOptions,
  RequestWithDefaultsFunction
} from './requestTypes';
import helpers from '../helpers';

type RequestsInParallelWithRequestWithDefaultsFunction = (
  allRequestsOptions: RequestOptions[],
  responseGetPath?: string,
  possibleSimultaneousRequests?: number
) => AnyPromiseResponse;

const createRequestsInParallel =
  (
    requestWithDefaults: RequestWithDefaultsFunction
  ): RequestsInParallelWithRequestWithDefaultsFunction =>
  async (
    allRequestsOptions: RequestOptions[],
    responseGetPath: string = 'body',
    possibleSimultaneousRequests: number = 10,
    returnErrors: boolean = false
  ) => {
    const unexecutedRequestFunctions = map(
      ({ entity, ...requestOptions }) =>
        async () => {
          const response = await requestWithDefaults(requestOptions);
          const result = responseGetPath ? get(responseGetPath, response) : response;
          return entity ? { entity, result } : result;
        },
      allRequestsOptions
    );

    const results = await helpers.parallelLimit(
      unexecutedRequestFunctions,
      possibleSimultaneousRequests,
      returnErrors
    );

    return results;
  };

export default createRequestsInParallel;
