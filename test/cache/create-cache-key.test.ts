import crypto from 'crypto';
import { createCacheKey } from '../../lib/cache';
import { LibraryUsageError } from '../../lib/errors';

describe('createCacheKey', () => {
  it('should create a key with prefix and SHA-256 hash', () => {
    const key = createCacheKey('lookup', '192.168.1.1');
    const expectedHash = crypto.createHash('sha256').update('192.168.1.1').digest('hex');
    expect(key).toBe(`lookup_${expectedHash}`);
  });

  it('should produce a 64-char hex hash plus prefix and underscore', () => {
    const key = createCacheKey('test', 'value');
    // prefix(4) + underscore(1) + sha256 hex(64) = 69
    expect(key).toHaveLength(69);
  });

  it('should join multiple values with colons before hashing', () => {
    const key = createCacheKey('auth', 'user', 'pass');
    const expectedHash = crypto.createHash('sha256').update('user:pass').digest('hex');
    expect(key).toBe(`auth_${expectedHash}`);
  });

  it('should produce different keys for different values', () => {
    const key1 = createCacheKey('lookup', 'value-a');
    const key2 = createCacheKey('lookup', 'value-b');
    expect(key1).not.toBe(key2);
  });

  it('should produce different keys for different prefixes', () => {
    const key1 = createCacheKey('lookup', 'same-value');
    const key2 = createCacheKey('config', 'same-value');
    expect(key1).not.toBe(key2);
  });

  it('should only contain valid cache key characters', () => {
    const key = createCacheKey('test', 'https://example.com/path?q=1&x=2');
    expect(key).toMatch(/^[a-zA-Z0-9._-]+$/);
  });

  it('should accept dots, underscores, and hyphens in prefix', () => {
    expect(() => createCacheKey('my.prefix', 'val')).not.toThrow();
    expect(() => createCacheKey('my_prefix', 'val')).not.toThrow();
    expect(() => createCacheKey('my-prefix', 'val')).not.toThrow();
  });

  it('should throw LibraryUsageError for empty prefix', () => {
    expect(() => createCacheKey('', 'value')).toThrow(LibraryUsageError);
    expect(() => createCacheKey('', 'value')).toThrow(/must be a non-empty string/);
  });

  it('should throw LibraryUsageError for prefix with invalid characters', () => {
    expect(() => createCacheKey('has space', 'val')).toThrow(LibraryUsageError);
    expect(() => createCacheKey('has:colon', 'val')).toThrow(LibraryUsageError);
    expect(() => createCacheKey('has/slash', 'val')).toThrow(LibraryUsageError);
    expect(() => createCacheKey('has@symbol', 'val')).toThrow(LibraryUsageError);
  });

  it('should include allowed characters in the error message', () => {
    expect(() => createCacheKey('bad prefix', 'val')).toThrow(
      /letters, digits, dots, underscores, and hyphens/
    );
  });

  it('should throw LibraryUsageError if prefix is too long', () => {
    const longPrefix = 'a'.repeat(186); // 186 + 1 + 64 = 251 > 250
    expect(() => createCacheKey(longPrefix, 'val')).toThrow(LibraryUsageError);
    expect(() => createCacheKey(longPrefix, 'val')).toThrow(/too long/);
  });

  it('should accept a prefix at the maximum valid length', () => {
    const maxPrefix = 'a'.repeat(185); // 185 + 1 + 64 = 250
    expect(() => createCacheKey(maxPrefix, 'val')).not.toThrow();
    expect(createCacheKey(maxPrefix, 'val')).toHaveLength(250);
  });
});
