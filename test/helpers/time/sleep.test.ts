const sleep = require('../../../lib/helpers/time/sleep');

jest.useFakeTimers();
jest.spyOn(global, 'setTimeout');

describe('sleep', () => {
  it('should wait for 1 second', () => {
    sleep(1000).then(() => {
      expect(setTimeout).toHaveBeenCalledTimes(1);
      expect(setTimeout).toHaveBeenLastCalledWith(expect.any(Function), 1000);
    });
  });
});
