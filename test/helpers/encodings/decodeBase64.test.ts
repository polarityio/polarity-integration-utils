const decodeBase64 = require('../../../lib/helpers/encodings/decodeBase64');

describe('decodeBase64', () => {
  it('should decode base64 strings', () => {
    expect(decodeBase64('')).toBe('');
    expect(decodeBase64('VGhpcyBpcyBhIHN0cmluZw==')).toBe('This is a string');
    expect(
      decodeBase64(
        'bm9uIGFscGhhYmV0aWNhbDogMTIzNDU2Nzg5MCFAIyQlXiYqKClfKy09e31bXXwnIi8/Lj4sPGB+'
      )
    ).toBe('non alphabetical: 1234567890!@#$%^&*()_+-={}[]|\'"/?.>,<`~');
  });
});
