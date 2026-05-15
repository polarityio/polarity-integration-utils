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
 * @param values - One or more values to hash (e.g., entity value, username).
 * @returns A key in the form `prefix_<64-char hex hash>`.
 *
 * @throws {@link LibraryUsageError}
 * If `prefix` is empty, contains invalid characters, or would cause the
 * resulting key to exceed 250 characters.
 *
 * @public
 */
export function createCacheKey(prefix: string, ...values: string[]): string {
  if (!prefix || !VALID_PREFIX.test(prefix)) {
    throw new LibraryUsageError(
      `Invalid cache key prefix: "${prefix}". ` +
        'Prefix must be a non-empty string containing only letters, digits, dots, underscores, and hyphens ' +
        '(must match /^[a-zA-Z0-9._-]+$/).'
    );
  }

  const hash = crypto.createHash('sha256').update(values.join(':')).digest('hex');
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
