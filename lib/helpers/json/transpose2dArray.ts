import { reduce } from 'lodash/fp';

const transpose2dArray = (twoDimensionalArray?: [] | Array<[any, any]>) =>
  reduce(
    (agg, [key, value]) => [
      [...agg[0], key],
      [...agg[1], value]
    ],
    [[], []],
    twoDimensionalArray
  );

export default transpose2dArray;
