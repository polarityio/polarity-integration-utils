/**
 * @public
 * @param error - The error to be parsed into a JSON object. This can be any value,
 * but is typically an Error instance or an instance of IntegrationError.
 */
export const parseErrorToReadableJson = (error: unknown) =>
  JSON.parse(JSON.stringify(error, Object.getOwnPropertyNames(error)));
