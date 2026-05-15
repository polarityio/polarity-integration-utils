import crypto from 'crypto';
import { LibraryUsageError } from '../errors';

const VALID_PREFIX = /^[a-zA-Z0-9._-]+$/;
const MAX_KEY_LENGTH = 250;

/**
 * Creates a cache-safe key by hashing the input values with SHA-256 and
 * prepending a descriptive prefix.
 *
 * Use this to derive cache keys from dynamic or sensitive data (entity values,
 * credentials, etc.) that may contain characters outside the allowed set.
 *
 * @param prefix - A short descriptive label using only letters, digits, dots,
 *   underscores, and hyphens (must match `/^[a-zA-Z0-9._-]+$/`).
 * @param value - First value to hash (required).
 * @param values - Additional values to hash (e.g., further credentials or identifiers).
 * @returns A key in the form `prefix_<64-char hex hash>`.
 *
 * @throws {@link LibraryUsageError}
 * If `prefix` or `value` is not a string, if `prefix` is empty or contains
 * invalid characters, if any additional value is not a string, or if the
 * resulting key would exceed 250 characters.
 *
 * @group Utilities
 * @public
 */
export function createCacheKey(prefix: string, value: string, ...values: string[]): string {
  if (typeof prefix !== 'string' || !prefix || !VALID_PREFIX.test(prefix)) {
    throw new LibraryUsageError(
      `Invalid cache key prefix: "${prefix}". ` +
        'Prefix must be a non-empty string containing only letters, digits, dots, underscores, and hyphens ' +
        '(must match /^[a-zA-Z0-9._-]+$/).'
    );
  }

  if (typeof value !== 'string') {
    throw new LibraryUsageError(
      `Invalid cache key value: expected a string but received ${typeof value}.`
    );
  }

  for (let i = 0; i < values.length; i++) {
    if (typeof values[i] !== 'string') {
      throw new LibraryUsageError(
        `Invalid cache key value at index ${i + 1}: expected a string but received ${typeof values[i]}.`
      );
    }
  }

  const hash = crypto.createHash('sha256').update(JSON.stringify([value, ...values])).digest('hex');
  const key = `${prefix}_${hash}`;

  if (key.length > MAX_KEY_LENGTH) {
    throw new LibraryUsageError(
      `Cache key prefix "${prefix}" is too long. ` +
        `The generated key is ${key.length} characters but the maximum is ${MAX_KEY_LENGTH}. ` +
        `Prefix must be at most ${MAX_KEY_LENGTH - 1 - 64} characters ` +
        '(250 minus 1 underscore minus 64-character SHA-256 hex digest).'
    );
  }

  return key;
}
