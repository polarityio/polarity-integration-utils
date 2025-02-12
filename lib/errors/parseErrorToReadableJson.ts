import type { Error } from './integrationError';

/**
 * @public
 * @param error - Error instance to parse into a plain old javascript object
 */
export const parseErrorToReadableJson = (error: Error) =>
  JSON.parse(JSON.stringify(error, Object.getOwnPropertyNames(error)));
