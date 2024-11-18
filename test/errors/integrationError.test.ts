import IntegrationError from '../../lib/errors/integrationError';

describe('IntegrationError', () => {
  it('should be of instance of IntegrationError', () => {
    const intError = new IntegrationError('detail message');

    expect(intError instanceof IntegrationError).toEqual(true);
  });

  it('should set default properties', () => {
    const intError = new IntegrationError('detail message');

    expect(intError).toHaveProperty('message', 'detail message');
    expect(intError).toHaveProperty('detail', 'detail message');
    expect(intError).toHaveProperty('name', 'IntegrationError');
  });

  it('should set a user defined message', () => {
    const message = 'This is the error message';
    const intError = new IntegrationError(message);

    expect(intError).toHaveProperty('message', message);
    expect(intError).toHaveProperty('detail', message);
  });

  it('should pass through user provided meta properties on meta property', () => {
    const message = 'This is the error message';
    const intError = new IntegrationError(message, {
      meta: {
        prop1: 'myprop1',
        prop2: 'myprop2'
      }
    });

    expect(intError).toHaveProperty('meta.prop1', 'myprop1');
    expect(intError).toHaveProperty('meta.prop2', 'myprop2');
  });

  it('should set `cause` parent Error as top level property', () => {
    const message = 'This is the error message';
    const parentMessage = 'This is the parent error message';
    const intError = new IntegrationError(message, {
      cause: new Error(parentMessage)
    });

    expect(intError).toHaveProperty('cause');
    expect(intError).toHaveProperty('cause.message', parentMessage);
  });


  it('should sanitize `requestOptions` auth.password property', () => {
    const message = 'This is the error message';
    const intError = new IntegrationError(message, {
      requestOptions: {
        auth: {
          username: 'username',
          password: 'sensitive'
        }
      }
    });

    expect(intError).toHaveProperty('requestOptions');
    expect(intError).toHaveProperty('requestOptions.auth.username', 'username');
    expect(intError).toHaveProperty('requestOptions.auth.password', '**********');
  });

  it('should sanitize `requestOptions` auth.bearer property', () => {
    const message = 'This is the error message';
    const intError = new IntegrationError(message, {
      requestOptions: {
        auth: {
          bearer: 'sensitive'
        }
      }
    });

    expect(intError).toHaveProperty('requestOptions');
    expect(intError).toHaveProperty('requestOptions.auth.bearer', '**********');
  });

  it('should sanitize `requestOptions` body.password property', () => {
    const message = 'This is the error message';
    const intError = new IntegrationError(message, {
      requestOptions: {
        body: {
          password: 'sensitive'
        }
      }
    });

    expect(intError).toHaveProperty('requestOptions');
    expect(intError).toHaveProperty('requestOptions.body.password', '**********');
  });

  it('should sanitize `requestOptions` form.client_secret property', () => {
    const message = 'This is the error message';
    const intError = new IntegrationError(message, {
      requestOptions: {
        form: {
          client_secret: 'sensitive'
        }
      }
    });

    expect(intError).toHaveProperty('requestOptions');
    expect(intError).toHaveProperty('requestOptions.form.client_secret', '**********');
  });

  it('should sanitize `requestOptions` headers.Authorization', () => {
    const message = 'This is the error message';
    let intError = new IntegrationError(message, {
      requestOptions: {
        headers: {
          Authorization: 'sensitive'
        }
      }
    });

    expect(intError).toHaveProperty('requestOptions');
    expect(intError).toHaveProperty('requestOptions.headers.Authorization', '**********');

    intError = new IntegrationError(message, {
      requestOptions: {
        headers: {
          authorization: 'sensitive'
        }
      }
    });

    expect(intError).toHaveProperty('requestOptions');
    expect(intError).toHaveProperty('requestOptions.headers.authorization', '**********');
  });

  it('should sanitize `requestOptions` headers.x-api-key', () => {
    const message = 'This is the error message';
    let intError = new IntegrationError(message, {
      requestOptions: {
        headers: {
          'x-api-key': 'sensitive'
        }
      }
    });

    expect(intError).toHaveProperty('requestOptions');
    expect(intError).toHaveProperty('requestOptions.headers.x-api-key', '**********');

    intError = new IntegrationError(message, {
      requestOptions: {
        headers: {
          'X-Api-Key': 'sensitive'
        }
      }
    });

    expect(intError).toHaveProperty('requestOptions');
    expect(intError).toHaveProperty('requestOptions.headers.X-Api-Key', '**********');
  });

  it('should have a `toJSON` method', () => {
    const intError = new IntegrationError('detail message');
    expect(typeof intError.toJSON).toBe('function');
  });

  it('should serialize properly with minimal constructor', () => {
    const intError = new IntegrationError('this is the detail message');

    const serializedError = intError.toJSON();

    const expectedSerialization = {
      detail: 'this is the detail message',
      name: 'IntegrationError',
      title: 'IntegrationError'
    };

    expect(serializedError).toHaveProperty('stack');

    delete serializedError.stack;

    expect(serializedError).toEqual(expectedSerialization);
  });

  it('should serialize properly with all properties', () => {
    const causeError = new Error('this is the cause error');
    const intError = new IntegrationError('this is the detail message', {
      title: 'Custom Title',
      code: 'Custom Code',
      status: '400',
      cause: causeError,
      requestOptions: {
        headers: {
          Authorization: 'sensitive'
        }
      },
      meta: {
        additionalMeta: 'extra'
      }
    });

    const serializedError = intError.toJSON();

    const expectedSerialization = {
      detail: 'this is the detail message',
      name: 'IntegrationError',
      title: 'Custom Title',
      code: 'Custom Code',
      status: '400',
      cause: {
        message: 'this is the cause error'
      },
      requestOptions: {
        headers: {
          Authorization: '**********'
        }
      },
      meta: {
        additionalMeta: 'extra'
      }
    };

    // Can't test for exact match on stack traces so just check for property
    // existence and then remove it
    expect(serializedError).toHaveProperty('stack');
    expect(serializedError).toHaveProperty('cause.stack');

    delete serializedError.stack;
    delete serializedError.cause.stack;

    expect(serializedError).toEqual(expectedSerialization);
  });
});
