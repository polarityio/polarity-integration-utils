import type { HttpRequestOptions } from './polarity-request';
import { sanitizeObject } from '../internal/helpers/sanitize-object';

const DEFAULT_PATHS_TO_SANITIZE = [
  'auth.password',
  'auth.bearer',
  'body.password',
  'form.client_secret'
];

/**
 * Sanitizes the request options by removing sensitive information
 * from the provided request options object.
 * 
 * Default sanitized paths are:
 * 
 * - auth.password
 * - auth.bearer
 * - body.password
 * - form.client_secret
 * - headers.authorization
 * - headers.x-api-key
 *  
 * @param requestOptions - request options to sanitize
 * @param additionalPathsToSanitize - array of additional paths to sanitize in addition to the 
 * default paths.
 * @group Requests
 * @public
 */
export function sanitizeRequestOptions(
  requestOptions: HttpRequestOptions,
  additionalPathsToSanitize: string[] = []
): HttpRequestOptions {
  const pathsToSanitize = [
    ...DEFAULT_PATHS_TO_SANITIZE,
    ...additionalPathsToSanitize
  ];
  const sanitizedOptions = sanitizeObject(requestOptions, pathsToSanitize, '**********');

  if (sanitizedOptions.headers) {
    // case-insensitive header lookup
    // Note that if two headers are set that are the same but with different casing
    // this method will not sanitize both headers
    const headerLookup = Object.keys(sanitizedOptions.headers).reduce((accum, header) => {
      accum[header.toLowerCase()] = header;
      return accum;
    }, {});

    if (headerLookup['authorization']) {
      sanitizedOptions.headers[headerLookup['authorization']] = '**********';
    }

    if (headerLookup['x-api-key']) {
      sanitizedOptions.headers[headerLookup['x-api-key']] = '**********';
    }
  }

  return sanitizedOptions;
}
