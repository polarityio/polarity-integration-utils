/**
 * @public
 * @param error - The error to be parsed into a JSON object. This can be any value,
 * but is typically an Error instance or an instance of IntegrationError.
 */
export const parseErrorToReadableJson = (error: unknown) => {
  if (error === undefined) {
    return undefined;
  }

  if (error !== null && (typeof error === 'object' || typeof error === 'function')) {
    return JSON.parse(
      JSON.stringify(error, Object.getOwnPropertyNames(error)),
    );
  }

  return JSON.parse(JSON.stringify(error));
};
