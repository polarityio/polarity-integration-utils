import { setLogger } from '../../lib/logging/logger';
import { identity } from 'lodash/fp';
import createRequestWithDefaults from '../../lib/requests/createRequestWithDefaults';
import request from 'postman-request';

const identityLogger = {
  trace: identity,
  info: identity,
  error: identity,
  debug: identity,
  fatal: identity,
  warn: identity
};
beforeAll(() => {
  setLogger(identityLogger);
});

jest.mock('postman-request', () => ({
  defaults: jest.fn().mockImplementation(() => () => 'Request Ran')
}));
jest.mock('fs', () => ({
  readFileSync: jest.fn().mockImplementation((x) => x)
}));

describe('createRequestWithDefaults', () => {
  it('should return a requestWithDefaults function', () => {
    const requestWithDefaults = createRequestWithDefaults({});
    expect(requestWithDefaults).toBeInstanceOf(Function);
  });
  describe('parameters', () => {
    describe('config', () => {
      it('should pass config request options to request.defaults', () => {
        const configRequestOptions = {
          ca: 'a',
          cert: 'b',
          key: 'c',
          passphrase: 'd',
          proxy: 'e',
          rejectUnauthorized: true,
          json: false
        };
        createRequestWithDefaults({
          config: {
            request: configRequestOptions
          }
        });
        expect(request.defaults).toHaveBeenCalledWith(
          expect.objectContaining(configRequestOptions)
        );
      });
    });
    describe('roundedSuccessStatusCodes', () => {
      it.skip('should throw error when the response status code is not included in this array', () => {
        //TODO
      });
    });
    describe('useLimiter', () => {
      it.skip('should run request without bottleneck limiter by default when this is not passed or set to false', () => {
        //TODO
      });
      it.skip('should run request with bottleneck limiter if set to `true`', () => {
        //TODO
      });
    });
    describe('requestOptionsToOmitFromLogsKeyPaths', () => {
      it.skip('should not omit logs not found in this argument', () => {
        //TODO
      });
      it.skip('should omit the key paths from logs', () => {
        //TODO
      });
    });

    describe('preprocessRequestOptions', () => {
      it.skip('should run before running the request function', () => {
        //TODO
      });
      it.skip('should receive the requestOptions passed into the request function', () => {
        //TODO
      });
      it.skip('should use the results from this function in the request function', () => {
        //TODO
      });
      it.skip('should throw if an error is thrown in this function', () => {
        //TODO
      });
    });
    describe('postprocessRequestResponse', () => {
      it.skip('should receive the request `response`, and `requestOptions` passed into the original request function', () => {
        //TODO
      });
      it.skip('should run after running the request function', () => {
        //TODO
      });
      it.skip('should not run after running the request function if the request throws', () => {
        //TODO
      });
      it.skip('should return the changed results of this function, rather than the direct result of the request response', () => {
        //TODO
      });
      it.skip('should throw if an error is thrown in this function', () => {
        //TODO
      });
    });
    describe('postprocessRequestFailure', () => {
      it.skip('should receive the request `error`, and `requestOptions` passed into the original request function', () => {
        //TODO
      });
      it.skip('should run after running the request function if the request throws', () => {
        //TODO
      });
      it.skip('should not run after running a successful request', () => {
        //TODO
      });
      it.skip('should return the changed results of this function, rather than throwing the original request error', () => {
        //TODO
      });
      it.skip('should throw if an error is thrown in this function', () => {
        //TODO
      });
    });
  });
});
