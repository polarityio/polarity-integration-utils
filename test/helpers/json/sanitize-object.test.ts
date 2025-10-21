// sanitizeObject.test.ts

import { sanitizeObject } from '../../../lib/internal/helpers/sanitize-object';

describe('sanitizeObject', () => {
  test('returns null if input is null', () => {
    const result = sanitizeObject(null, ['any.path']);
    expect(result).toBeNull();
  });

  test('returns undefined if input is undefined', () => {
    const result = sanitizeObject(undefined, ['some.path']);
    expect(result).toBeUndefined();
  });

  test('returns same value if input is not an object (e.g., number)', () => {
    // TypeScript constraints won't let us call it with a plain number unless we cast
    const input = 42 as unknown as object;
    const result = sanitizeObject(input, ['some.path']);
    expect(result).toBe(input); // same reference
  });

  test('returns original object if paths is not an array', () => {
    const original = { user: { password: 'secret' } };
    // Casting 'paths' to string for testing the scenario
    const result = sanitizeObject(original, 'invalid paths' as unknown as string[]);
    expect(result).toBe(original); // same reference, no changes
  });

  test('does not mutate the original object', () => {
    const original = {
      user: {
        password: 'secret'
      }
    };
    const paths = ['user.password'];
    const result = sanitizeObject(original, paths);

    // Check that original was not changed
    expect(original.user.password).toBe('secret');
    // Check that returned object is different and masked
    expect(result).not.toBe(original);
    expect(result?.user.password).toBe('******');
  });

  test('masks single path in a nested object', () => {
    const original = {
      user: {
        name: 'Alice',
        password: 'secret'
      }
    };
    const paths = ['user.password'];
    const masked = sanitizeObject(original, paths);

    expect(masked).toEqual({
      user: {
        name: 'Alice',
        password: '******'
      }
    });
  });

  test('masks multiple paths in a nested object', () => {
    const original = {
      user: {
        name: 'Bob',
        password: 'myPassword',
        creditCard: {
          number: '1111-2222-3333-4444',
          expiry: '12/30'
        }
      }
    };
    const paths = ['user.password', 'user.creditCard.number'];
    const masked = sanitizeObject(original, paths);

    expect(masked).toEqual({
      user: {
        name: 'Bob',
        password: '******',
        creditCard: {
          number: '******',
          expiry: '12/30'
        }
      }
    });
  });

  test('masks using custom mask string', () => {
    const original = {
      user: {
        secretInfo: 'top-secret'
      }
    };
    const masked = sanitizeObject(original, ['user.secretInfo'], '[REDACTED]');

    expect(masked).toEqual({
      user: {
        secretInfo: '[REDACTED]'
      }
    });
  });

  test('handles bracket notation for arrays', () => {
    const original = {
      items: [{ secret: 'SECRET1' }, { secret: 'SECRET2' }]
    };
    const masked = sanitizeObject(original, ['items[1].secret']);

    expect(masked).toEqual({
      items: [{ secret: 'SECRET1' }, { secret: '******' }]
    });
  });

  test('returns cloned object when path does not exist (no error)', () => {
    const original = {
      someKey: 'value'
    };
    const masked = sanitizeObject(original, ['nonexistent.path']);
    // Path doesn't exist, so result is effectively the same content
    // but is a different reference because we always clone.
    expect(masked).toEqual(original);
    expect(masked).not.toBe(original);
  });
});
