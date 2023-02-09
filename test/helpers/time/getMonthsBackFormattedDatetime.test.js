const { NotImplementedError } = require('../../../lib/errors');
const getMonthsBackFormattedDatetime = require('../../../lib/helpers/time/getMonthsBackFormattedDatetime');

describe('getMonthsBackFormattedDatetime', () => {
  it('should throw NotImplementedError', () => {
    expect(getMonthsBackFormattedDatetime).toThrow(NotImplementedError);
  })
})