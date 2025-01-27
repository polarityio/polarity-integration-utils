import { setLogger } from '../../lib/logging/logger';
import { identity } from 'lodash/fp';
import { PolarityRequest } from '../../lib/requests/polarityRequest';
import postmanRequest from 'postman-request';

const identityLogger = {
  child: identity,
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

describe('polarityRequest', () => {
  it('should return a PolarityRequest object with default values', () => {
    const request = new PolarityRequest();
    expect(request).toBeInstanceOf(PolarityRequest);
  });

  it('should create a PolarityRequest object with values', () => {
    const defaultRequestOptions = {
      rejectUnauthorized: true,
      json: true
    };
    
    const request = new PolarityRequest();
    
    expect(postmanRequest.defaults).toHaveBeenCalledWith(
      expect.objectContaining(defaultRequestOptions)
    );
    
    expect(request.requestOptionsToOmitFromLogsKeyPaths).toEqual([]);
    expect(request.roundedSuccessStatusCodes).toEqual([200]);
    
  });

  // it('should create a PolarityRequest object with values', () => {
  //   const defaultRequestOptions = {
  //     ca: 'a',
  //     cert: 'b',
  //     key: 'c',
  //     passphrase: 'd',
  //     proxy: 'e',
  //     rejectUnauthorized: false,
  //     json: false
  //   };
  //   new PolarityRequest({
  //     defaults: defaultRequestOptions
  //   });
  //   expect(request.defaults).toHaveBeenCalledWith(
  //     expect.objectContaining(defaultRequestOptions)
  //   );
  // });
});
