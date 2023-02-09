const transpose2dArray = require('../../../lib/helpers/json/transpose2dArray');

describe('transpose2dArray', () => {
  // Positive Test Cases
  it('should return empty 2D array if passed undefined or empty array', () => {
    expect(transpose2dArray()).toEqual([[], []]);
    expect(transpose2dArray([])).toEqual([[], []]);
  });
  it('should return 2D array transposed', () => {
    const result = transpose2dArray([
      ['a', 1],
      ['b', 2],
      ['c', 3]
    ]);

    expect(result).toEqual([
      ['a', 'b', 'c'],
      [1, 2, 3]
    ]);
  });
});
