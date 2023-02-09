const { reduce } = require('lodash/fp');

const transpose2dArray = (twoDimensionalArray) =>
  reduce(
    (agg, [key, value]) => [
      [...agg[0], key],
      [...agg[1], value]
    ],
    [[], []],
    twoDimensionalArray
  );

module.exports = transpose2dArray;
