import { ApiRequestError } from '../../lib/errors';

describe('ApiRequestError', () => {
  it('should be of instance of ApiRequestError', () => {
    const apiError = new ApiRequestError('detail message');

    expect(apiError instanceof ApiRequestError).toEqual(true);
  });

  it('should set default properties', () => {
    const apiError = new ApiRequestError('detail message');

    expect(apiError).toHaveProperty('message', 'detail message');
    expect(apiError).toHaveProperty('detail', 'detail message');
    expect(apiError).toHaveProperty('name', 'ApiRequestError');
  });

  it('should set a detail and message property via constructor', () => {
    const message = 'This is the error message';
    const error = new ApiRequestError(message);

    expect(error).toHaveProperty('message', message);
    expect(error).toHaveProperty('detail', message);
  });
});
