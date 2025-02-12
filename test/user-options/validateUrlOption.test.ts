import { ValidateOptionsUserOptions } from '../../lib/user-options/types';
import validateUrlOption from '../../lib/user-options/validateUrlOption';

const options: ValidateOptionsUserOptions = {
  urlEmpty: { key: 'urlEmpty', value: '' },
  normalUrl: { key: 'normalUrl', value: 'https://google.com' },
  trailingForwardSlashUrl: {
    key: 'trailingForwardSlashUrl',
    value: 'https://google.com/'
  },
  doubleTrailingForwardSlashUrl: {
    key: 'doubleTrailingForwardSlashUrl',
    value: 'https://google.com//'
  },
  domain: { key: 'domain', value: 'google.com' },
  trailingForwardSlashDomain: { key: 'trailingForwardSlashDomain', value: 'google.com/' },
  justString: { key: 'justString', value: 'google' }
};

describe('validateUrlOption', () => {
  // Positive Test Cases
  it('should not return any validation errors if no cases errors are triggered', () => {
    const normalUrlResult = validateUrlOption(options, 'normalUrl');
    const trailingForwardSlashUrlResult = validateUrlOption(
      options,
      'trailingForwardSlashUrl'
    );

    expect(() => normalUrlResult).not.toThrow();
    expect(() => trailingForwardSlashUrlResult).not.toThrow();

    expect(normalUrlResult).toEqual([]);
    expect(trailingForwardSlashUrlResult).toEqual([]);
  });
  it('should use a default key of `url` for the `urlKey` function parameter', () => {
    expect(() => validateUrlOption(options)).toThrow(
      new Error(
        "User Option key `url` is not defined in the config.js.  It's also possible you need to change the package.json version for the client to pick up your `config/config.js` changes."
      )
    );
    expect(() => validateUrlOption(options, 'url')).toThrow(
      new Error(
        "User Option key `url` is not defined in the config.js.  It's also possible you need to change the package.json version for the client to pick up your `config/config.js` changes."
      )
    );
  });

  it('should return input validation error if user option is left empty', () => {
    const urlWithNoContent = () => validateUrlOption(options, 'urlEmpty');

    expect(urlWithNoContent).not.toThrow();

    expect(urlWithNoContent()).toEqual([{ key: 'urlEmpty', message: '* Required' }]);
  });
  it('should return input validation error if url ends in `//`', () => {
    const urlWithDoubleForwardSlashes = () =>
      validateUrlOption(options, 'doubleTrailingForwardSlashUrl');

    expect(urlWithDoubleForwardSlashes).not.toThrow();

    expect(urlWithDoubleForwardSlashes()).toEqual([
      { key: 'doubleTrailingForwardSlashUrl', message: 'Your URL must not end with a //' }
    ]);
  });

  it('should return input validation error if url fails to be parsed by the native JavaScript `URL` class', () => {
    const domain = () => validateUrlOption(options, 'domain');
    const trailingForwardSlashDomain = () =>
      validateUrlOption(options, 'trailingForwardSlashDomain');
    const justString = () => validateUrlOption(options, 'justString');

    expect(domain).not.toThrow();
    expect(trailingForwardSlashDomain).not.toThrow();
    expect(justString).not.toThrow();

    expect(domain()).toEqual([
      {
        key: 'domain',
        message:
          'What is currently provided is not a valid URL. You must provide a valid Instance URL.'
      }
    ]);
    expect(trailingForwardSlashDomain()).toEqual([
      {
        key: 'trailingForwardSlashDomain',
        message:
          'What is currently provided is not a valid URL. You must provide a valid Instance URL.'
      }
    ]);
    expect(justString()).toEqual([
      {
        key: 'justString',
        message:
          'What is currently provided is not a valid URL. You must provide a valid Instance URL.'
      }
    ]);
  });
  it('should return input validation errors for param `otherValidationErrors` if no validation errors are being triggered', () => {
    const normalUrlWithoutParam = () => validateUrlOption(options, 'normalUrl');
    const normalUrlWithEmptyParam = () => validateUrlOption(options, 'normalUrl', []);
    const normalUrlWithContentInParam = () =>
      validateUrlOption(options, 'normalUrl', [
        { key: 'otherKey', message: 'something wrong' }
      ]);

    expect(normalUrlWithoutParam).not.toThrow();
    expect(normalUrlWithEmptyParam).not.toThrow();
    expect(normalUrlWithContentInParam).not.toThrow();

    expect(normalUrlWithoutParam()).toEqual([]);
    expect(normalUrlWithEmptyParam()).toEqual([]);
    expect(normalUrlWithContentInParam()).toEqual([
      { key: 'otherKey', message: 'something wrong' }
    ]);
  });

  it('should return input validation errors for param `otherValidationErrors` along with any additionally triggered validation errors', () => {
    const urlWithNoContent = () =>
      validateUrlOption(options, 'urlEmpty', [
        { key: 'otherKey', message: 'something wrong' }
      ]);
    const urlWithDoubleForwardSlashes = () =>
      validateUrlOption(options, 'doubleTrailingForwardSlashUrl', [
        { key: 'otherKey', message: 'something wrong' }
      ]);
    const domain = () =>
      validateUrlOption(options, 'domain', [
        { key: 'otherKey', message: 'something wrong' }
      ]);

    expect(urlWithNoContent).not.toThrow();
    expect(urlWithDoubleForwardSlashes).not.toThrow();
    expect(domain).not.toThrow();

    expect(urlWithNoContent()).toEqual([
      { key: 'otherKey', message: 'something wrong' },
      { key: 'urlEmpty', message: '* Required' }
    ]);
    expect(urlWithDoubleForwardSlashes()).toEqual([
      { key: 'otherKey', message: 'something wrong' },
      { key: 'doubleTrailingForwardSlashUrl', message: 'Your URL must not end with a //' }
    ]);
    expect(domain()).toEqual([
      { key: 'otherKey', message: 'something wrong' },
      {
        key: 'domain',
        message:
          'What is currently provided is not a valid URL. You must provide a valid Instance URL.'
      }
    ]);
  });
  it('should throw an error if the `urlKey` function parameter is not defined in the options object', () => {
    expect(() => validateUrlOption(options, 'notInOptions')).toThrow(
      new Error(
        "User Option key `notInOptions` is not defined in the config.js.  It's also possible you need to change the package.json version for the client to pick up your `config/config.js` changes."
      )
    );
  });
  it('should return an error if the `urlKey` function parameter is an empty string in the options object', () => {
    expect(validateUrlOption(options, 'urlEmpty')).toEqual([
      {
        key: 'urlEmpty',
        message: '* Required'
      }
    ]);
  });
});
