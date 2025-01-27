import { reduce } from 'lodash/fp';

/**
 * Transposes a 2D array, converting rows into columns.
 *
 * @public
 * @param twoDimensionalArray - The 2D array to transpose.
 * @returns The transposed 2D array.
 */
const transpose2dArray = (twoDimensionalArray?: [] | Array<[unknown, unknown]>) =>
  reduce(
    (agg, [key, value]) => [
      [...agg[0], key],
      [...agg[1], value]
    ],
    [[], []],
    twoDimensionalArray
  );

export default transpose2dArray;
