import NetworkError from '../../lib/errors/networkError';

describe('NetworkError', () => {
  it('should be of instance of IntegrationError', () => {
    const networkError = new NetworkError('detail message');

    expect(networkError instanceof NetworkError).toEqual(true);
  });

  it('should set default properties', () => {
    const intError = new NetworkError('detail message');

    expect(intError).toHaveProperty('message', 'detail message');
    expect(intError).toHaveProperty('detail', 'detail message');
    expect(intError).toHaveProperty('name', 'NetworkError');
  });

  it('should set help property for SSL errors', () => {
    const sslError = new Error('ssl error');
    
    // @ts-expect-error "code" is not a property on Error but is a property on Node.js errors
    sslError.code = 'DEPTH_ZERO_SELF_SIGNED_CERT';
    const intError = new NetworkError('detail', {
      cause: sslError
    });

    expect(intError).toHaveProperty('help');
    
    expect(intError.help.substring(0, 10)).toEqual('SSL errors');
  });

  it('should set help property for Network errors', () => {
    const networkError = new Error('ssl error');

    // @ts-expect-error "code" is not a property on Error but is a property on Node.js errors
    networkError.code = 'ECONNRESET';
    const intError = new NetworkError('detail', {
      cause: networkError
    });

    expect(intError).toHaveProperty('help');

    expect(intError.help.substring(0, 7)).toEqual('Network');
  });
});
