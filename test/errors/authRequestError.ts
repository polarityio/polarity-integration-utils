import { AuthRequestError } from '../../lib/errors'

describe('AuthRequestError', () => {
  it('should be of instance of AuthRequestError', () => {
    const error = new AuthRequestError('detail message');

    expect(error instanceof AuthRequestError).toEqual(true);
  });

  it('should set default properties', () => {
    const error = new AuthRequestError('detail message');

    expect(error).toHaveProperty('message', 'detail message');
    expect(error).toHaveProperty('detail', 'detail message');
    expect(error).toHaveProperty('name', 'AuthRequestError');
  });

  it('should set a detail and message property via constructor', () => {
    const message = 'This is the error message';
    const error = new AuthRequestError(message);

    expect(error).toHaveProperty('message', message);
    expect(error).toHaveProperty('detail', message);
  });
});
