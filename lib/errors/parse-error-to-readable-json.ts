import type { ResponseError } from './integration-error';

/**
 * @public
 * @param error - Error instance to parse into a plain old javascript object
 */
export const parseErrorToReadableJson = (error: ResponseError) =>
  JSON.parse(JSON.stringify(error, Object.getOwnPropertyNames(error)));
