const encodeBase64 = require('../../../lib/helpers/encodings/encodeBase64');

describe('encodeBase64', () => {
  it('should encode a strings into base64', () => {
    expect(encodeBase64('')).toBe('');
    expect(encodeBase64('This is a string')).toBe('VGhpcyBpcyBhIHN0cmluZw==');
    expect(
      encodeBase64('non alphabetical: 1234567890!@#$%^&*()_+-={}[]|\'"/?.>,<`~')
    ).toBe(
      'bm9uIGFscGhhYmV0aWNhbDogMTIzNDU2Nzg5MCFAIyQlXiYqKClfKy09e31bXXwnIi8/Lj4sPGB+'
    );
  });
});
