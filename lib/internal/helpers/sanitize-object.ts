/** @internal */
import { set, has } from 'lodash';
import { structuredClone } from 'node:util';

/**
 * Sanitizes the specified paths in an object by setting their values to a mask.
 * This function returns a **new** object (deep clone) and does **not** mutate the original.
 *
 * @param obj - An object to sanitize (or nullish, which is returned directly).
 * @param paths - An array of dot/bracket-notation paths to mask.
 * @param mask - A replacement string. Defaults to "******".
 * @returns A new object that has specified paths overwritten by `mask`.
 */
export function sanitizeObject<T extends object>(
  obj: T | null | undefined,
  paths: string[] = [],
  mask: string = '******'
): T | null | undefined {
  // If not an object (null, undefined, etc.), return as-is.
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  // If paths is not a valid array, return as-is.
  if (!Array.isArray(paths)) {
    return obj;
  }

  // Create a deep clone so we do NOT mutate the original object
  const clonedObj = structuredClone(obj);

  // Replace each path's value with `mask`
  for (const path of paths) {
    if (typeof path === 'string' && has(clonedObj, path)) {
      set(clonedObj, path, mask);
    }
  }

  return clonedObj;
}
