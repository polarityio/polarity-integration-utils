import { RetryRequestError } from '../../lib/errors';

describe('RetryRequestError', () => {
  it('should be of instance of RetryRequestError', () => {
    const error = new RetryRequestError('detail message');

    expect(error instanceof RetryRequestError).toEqual(true);
  });

  it('should set default properties', () => {
    const error = new RetryRequestError('detail message');

    expect(error).toHaveProperty('message', 'detail message');
    expect(error).toHaveProperty('detail', 'detail message');
    expect(error).toHaveProperty('name', 'RetryRequestError');
  });

  it('should set a detail and message property via constructor', () => {
    const message = 'This is the error message';
    const error = new RetryRequestError(message);

    expect(error).toHaveProperty('message', message);
    expect(error).toHaveProperty('detail', message);
  });
});
