import type { ResponseError } from './integration-error';

/**
 * @deprecated Do not use in v2 integrations.
 * @group Utilities
 * @public
 * @param error - Error instance to parse into a plain old javascript object
 */
export const parseErrorToReadableJson = (error: ResponseError) =>
  JSON.parse(JSON.stringify(error, Object.getOwnPropertyNames(error)));
