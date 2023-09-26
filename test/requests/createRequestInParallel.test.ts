import createRequestsInParallel from '../../lib/requests/createRequestsInParallel';

describe('createRequestsInParallel', () => {
  it('should return a requestsInParallel', () => {
    const requestsInParallel = createRequestsInParallel(async () => {});
    expect(requestsInParallel).toBeInstanceOf(Function);
  });
  describe('allRequestsOptions', () => {
    it.skip('should run `requestWithDefaults` once for each of the values in `allRequestsOptions`', () => {
      //TODO
    });
    it.skip('should run `requestWithDefaults` with the values of `allRequestsOptions`', () => {
      //TODO
    });
  });
  describe('responseGetPath', () => {
    it.skip('should return the `body` of the response by default', () => {
      //TODO
    });
    it.skip('should return the specified path from the response', () => {
      //TODO
    });
  });
  describe('possibleSimultaneousRequests', () => {
    it.skip('should be passed into parallelLimit helper function', () => {
      //TODO
    });
  });
  describe('returnErrors', () => {
    it.skip('should throw errors, if the any of the `requestWithDefaults` function calls throws, by default', () => {
      //TODO
    });
    it.skip('should return throw errors from the `requestWithDefaults` function if set to true', () => {
      //TODO
    });
  });
});
