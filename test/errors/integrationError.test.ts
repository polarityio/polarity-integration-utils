import IntegrationError from '../../lib/errors/integrationError';

describe('IntegrationError', () => {
  it('should set default properties', () => {
    const intError = new IntegrationError();

    expect(intError).toHaveProperty('message');
    expect(intError).toHaveProperty('meta', {});
    expect(intError).toHaveProperty('detail', '');
    expect(intError).toHaveProperty('name', 'IntegrationError');
    expect(intError).toHaveProperty('help', '');
  });

  it('should set a user defined message', () => {
    const message = 'This is the error message';
    const intError = new IntegrationError(message);

    expect(intError).toHaveProperty('message', message);
    expect(intError).toHaveProperty('detail', message);
  });

  it('should pass through user provided properties', () => {
    const message = 'This is the error message';
    const intError = new IntegrationError(message, {
      prop1: 'myprop1',
      prop2: 'myprop2'
    });

    expect(intError).toHaveProperty('meta.prop1', 'myprop1');
    expect(intError).toHaveProperty('meta.prop2', 'myprop2');
  });

  it('should set `cause` parent Error on meta property', () => {
    const message = 'This is the error message';
    const parentMessage = 'This is the parent error message';
    const intError = new IntegrationError(message, {
      cause: new Error(parentMessage)
    });

    expect(intError).toHaveProperty('meta.cause');
    expect(intError).toHaveProperty('meta.cause.message', parentMessage);
  });

  it('should have a `toJSON` method', () => {
    const intError = new IntegrationError();
    expect(typeof intError.toJSON).toBe('function');
  });
});
